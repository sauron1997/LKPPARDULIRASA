export function applyDomainUpdater(currentValue, updater) {
  return typeof updater === 'function' ? updater(currentValue) : updater;
}

export function getDomainErrorMessage(error, fallbackMessage) {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export async function syncCollectionState({
  currentItems,
  nextItems,
  getId = (item) => item.id,
  createItem,
  updateItem,
  deleteItem,
  isEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right),
}) {
  const currentMap = new Map(currentItems.map((item) => [String(getId(item)), item]));
  const nextMap = new Map(nextItems.map((item) => [String(getId(item)), item]));

  for (const item of nextItems) {
    const itemId = String(getId(item));
    const current = currentMap.get(itemId);

    if (!current) {
      // Keep create/update ordering deterministic so optimistic UI can reconcile cleanly.
      // The backend remains the final source of truth.
      await createItem(item);
      continue;
    }

    if (!isEqual(current, item)) {
      await updateItem(item, current);
    }
  }

  for (const item of currentItems) {
    const itemId = String(getId(item));
    if (!nextMap.has(itemId)) {
      await deleteItem(item, currentMap.get(itemId));
    }
  }
}
