import { useEffect } from 'react';

function hideDeleteButtons(container) {
  container.querySelectorAll('button').forEach((button) => {
    if (button.textContent?.trim() !== 'Hapus') {
      return;
    }

    button.hidden = true;
    button.disabled = true;
    button.setAttribute('aria-hidden', 'true');
    button.setAttribute('tabindex', '-1');
  });
}

export function useSharedInboxDeleteGuard(containerRef, enabled = true) {
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) {
      return undefined;
    }

    hideDeleteButtons(container);

    const observer = new MutationObserver(() => {
      hideDeleteButtons(container);
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [containerRef, enabled]);
}

export default useSharedInboxDeleteGuard;
