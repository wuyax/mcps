export const formatAgentList = (agentList: readonly string[], emptyLabel = "(none)"): string =>
  agentList.length === 0 ? emptyLabel : agentList.join(", ");
