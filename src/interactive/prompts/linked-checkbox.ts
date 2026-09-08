import {
  Separator,
  ValidationError,
  createPrompt,
  isDownKey,
  isEnterKey,
  isNumberKey,
  isSpaceKey,
  isUpKey,
  makeTheme,
  useKeypress,
  useMemo,
  usePagination,
  usePrefix,
  useState,
  type Theme,
} from "@inquirer/core";
import type { Context } from "@inquirer/type";
import pc from "picocolors";

export interface LinkedChoice<Value> {
  value: Value;
  name?: string;
  checkedName?: string;
  description?: string;
  short?: string;
  disabled?: boolean | string;
  checked?: boolean;
  linkedValues?: Value[];
}

export interface NormalizedLinkedChoice<Value> {
  value: Value;
  name: string;
  checkedName: string;
  description?: string;
  short: string;
  disabled: boolean | string;
  checked: boolean;
  linkedValues: Value[];
}

export interface LinkedCheckboxTheme {
  icon: {
    checked: string;
    unchecked: string;
    cursor: string;
    disabledChecked: string;
    disabledUnchecked: string;
  };
  style: {
    disabled: (text: string) => string;
    renderSelectedChoices: <T>(
      selectedChoices: ReadonlyArray<NormalizedLinkedChoice<T>>,
      allChoices: ReadonlyArray<NormalizedLinkedChoice<T> | Separator>,
    ) => string;
    description: (text: string) => string;
    keysHelpTip: (keys: [key: string, action: string][]) => string;
    highlight: (text: string) => string;
  };
  i18n: {
    disabledError: string;
  };
}

const defaultTheme: LinkedCheckboxTheme = {
  icon: {
    checked: pc.green("[x]"),
    unchecked: pc.dim("[ ]"),
    cursor: pc.cyan(">"),
    disabledChecked: pc.dim("[x]"),
    disabledUnchecked: pc.dim("[-]"),
  },
  style: {
    disabled: (text: string) => pc.dim(text),
    renderSelectedChoices: (selectedChoices) =>
      selectedChoices.map((choice) => choice.short).join(", "),
    description: (text: string) => pc.cyan(text),
    keysHelpTip: (keys: [key: string, action: string][]) =>
      keys
        .map(([key, action]) => `${pc.bold(key)} ${pc.dim(action)}`)
        .join(pc.dim(" • ")),
    highlight: (text: string) => pc.cyan(text),
  },
  i18n: {
    disabledError: "This option is disabled and cannot be toggled.",
  },
};

export interface LinkedCheckboxConfig<Value = string> {
  message: string;
  prefix?: string;
  pageSize?: number;
  choices: ReadonlyArray<Separator | Value | LinkedChoice<Value>>;
  loop?: boolean;
  required?: boolean;
  validate?: (
    choices: readonly NormalizedLinkedChoice<Value>[],
  ) => boolean | string | Promise<string | boolean>;
  theme?: Partial<Theme<LinkedCheckboxTheme>>;
}

function isSelectable<Value>(
  item: NormalizedLinkedChoice<Value> | Separator,
): item is NormalizedLinkedChoice<Value> {
  return !Separator.isSeparator(item) && !item.disabled;
}

function isNavigable<Value>(
  item: NormalizedLinkedChoice<Value> | Separator,
): item is NormalizedLinkedChoice<Value> {
  return !Separator.isSeparator(item);
}

function isChecked<Value>(
  item: NormalizedLinkedChoice<Value> | Separator,
): item is NormalizedLinkedChoice<Value> {
  return !Separator.isSeparator(item) && item.checked;
}

function normalizeChoices<Value>(
  choices: ReadonlyArray<Separator | Value | LinkedChoice<Value>>,
): Array<NormalizedLinkedChoice<Value> | Separator> {
  return choices.map((choice) => {
    if (Separator.isSeparator(choice)) {
      return choice;
    }
    if (typeof choice !== "object" || choice === null || !("value" in choice)) {
      const name = String(choice);
      return {
        value: choice as Value,
        name,
        short: name,
        checkedName: name,
        disabled: false,
        checked: false,
        linkedValues: [],
      };
    }
    const name = choice.name ?? String(choice.value);
    return {
      value: choice.value,
      name,
      short: choice.short ?? name,
      checkedName: choice.checkedName ?? name,
      description: choice.description,
      disabled: choice.disabled ?? false,
      checked: choice.checked ?? false,
      linkedValues: choice.linkedValues ?? [],
    };
  });
}

export type LinkedCheckboxPrompt = <Value>(
  config: LinkedCheckboxConfig<Value>,
  context?: Context,
) => Promise<Value[]>;

export const linkedCheckbox: LinkedCheckboxPrompt = createPrompt(
  <Value>(config: LinkedCheckboxConfig<Value>, done: (values: Value[]) => void) => {
    const { pageSize = 10, loop = true, required, validate = () => true } = config;
    const theme = makeTheme(defaultTheme, config.theme);
    const [status, setStatus] = useState("idle");
    const prefix = usePrefix({ status, theme });
    const [items, setItems] = useState(() => normalizeChoices(config.choices));

    const bounds = useMemo(() => {
      const first = items.findIndex(isNavigable);
      let last = -1;
      for (let i = items.length - 1; i >= 0; i--) {
        if (isNavigable(items[i]!)) {
          last = i;
          break;
        }
      }
      if (first === -1 || last === -1) {
        throw new ValidationError("[linkedCheckbox prompt] No selectable choices.");
      }
      return { first, last };
    }, [items]);

    const [active, setActive] = useState(bounds.first);
    const [errorMsg, setError] = useState<string | undefined>();

    const toggleWithLinked = (targetIndex: number) => {
      const targetItem = items[targetIndex];
      if (!targetItem || Separator.isSeparator(targetItem) || targetItem.disabled) {
        return;
      }
      const nextChecked = !targetItem.checked;
      const targetValue = targetItem.value;
      const linked = new Set(targetItem.linkedValues);

      setItems((prevItems) =>
        prevItems.map((item) => {
          if (Separator.isSeparator(item) || item.disabled) {
            return item;
          }
          // Match self, explicit linked items, or symmetric link (item linking to targetValue)
          const isTargetOrLinked =
            item.value === targetValue ||
            linked.has(item.value) ||
            item.linkedValues.includes(targetValue);

          if (isTargetOrLinked) {
            return { ...item, checked: nextChecked };
          }
          return item;
        }),
      );
    };

    useKeypress(async (key) => {
      if (isEnterKey(key)) {
        const selection = items.filter(isChecked);
        const isValid = await validate([...selection]);
        if (required && selection.length === 0) {
          setError("At least one choice must be selected");
        } else if (isValid === true) {
          setStatus("done");
          done(selection.map((choice) => choice.value));
        } else {
          setError(typeof isValid === "string" ? isValid : "You must select a valid value");
        }
      } else if (isUpKey(key) || isDownKey(key)) {
        if (errorMsg) setError(undefined);
        if (
          loop ||
          (isUpKey(key) && active !== bounds.first) ||
          (isDownKey(key) && active !== bounds.last)
        ) {
          const offset = isUpKey(key) ? -1 : 1;
          let next = active;
          do {
            next = (next + offset + items.length) % items.length;
          } while (!isNavigable(items[next]!));
          setActive(next);
        }
      } else if (isSpaceKey(key)) {
        const activeItem = items[active];
        if (activeItem && !Separator.isSeparator(activeItem)) {
          if (activeItem.disabled) {
            setError(theme.i18n.disabledError);
          } else {
            setError(undefined);
            toggleWithLinked(active);
          }
        }
      } else if (key.name === "a") {
        const hasUnchecked = items.some((choice) => isSelectable(choice) && !choice.checked);
        setItems((prevItems) =>
          prevItems.map((item) => (isSelectable(item) ? { ...item, checked: hasUnchecked } : item)),
        );
      } else if (key.name === "i") {
        setItems((prevItems) =>
          prevItems.map((item) => (isSelectable(item) ? { ...item, checked: !item.checked } : item)),
        );
      } else if (isNumberKey(key)) {
        const selectedIndex = Number(key.name) - 1;
        let selectableIndex = -1;
        const position = items.findIndex((item) => {
          if (Separator.isSeparator(item)) return false;
          selectableIndex++;
          return selectableIndex === selectedIndex;
        });
        const selectedItem = items[position];
        if (selectedItem && isSelectable(selectedItem)) {
          setActive(position);
          setError(undefined);
          toggleWithLinked(position);
        }
      }
    });

    const message = theme.style.message(config.message, status);
    let description: string | undefined;

    const page = usePagination({
      items,
      active,
      renderItem({ item, isActive }) {
        if (Separator.isSeparator(item)) {
          return ` ${item.separator}`;
        }
        const cursor = isActive ? theme.icon.cursor : " ";
        if (item.disabled) {
          const disabledLabel = typeof item.disabled === "string" ? item.disabled : "(disabled)";
          const checkbox = item.checked ? theme.icon.disabledChecked : theme.icon.disabledUnchecked;
          return theme.style.disabled(`${cursor} ${checkbox} ${item.name} ${disabledLabel}`);
        }
        if (isActive) {
          description = item.description;
        }
        const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked;
        const name = item.checked ? item.checkedName : item.name;
        const color = isActive ? theme.style.highlight : (x: string) => x;
        return color(`${cursor} ${checkbox} ${name}`);
      },
      pageSize,
      loop,
    });

    if (status === "done") {
      const selection = items.filter(isChecked);
      const answer = theme.style.answer(theme.style.renderSelectedChoices(selection, items));
      return [prefix, message, answer].filter(Boolean).join(" ");
    }

    const helpLine = theme.style.keysHelpTip([
      ["↑↓", "navigate"],
      ["space", "toggle"],
      ["a", "all"],
      ["i", "invert"],
      ["⏎", "submit"],
    ]);

    const lines = [
      [prefix, message].filter(Boolean).join(" "),
      page,
      helpLine,
    ];

    if (description) {
      lines.push(theme.style.description(description));
    }
    if (errorMsg) {
      lines.push(theme.style.error(errorMsg));
    }

    return lines.join("\n");
  },
);
