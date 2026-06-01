import { useCallback, useMemo } from 'react';
import { getPublicSocialLinks } from '@lkp-parduli-rasa/domain';
import { useProfile } from './useProfile';

export function useSocialLinks() {
  const { profile, setProfile, isReady, error, reload } = useProfile();

  const setSocialLinks = useCallback((updater) => {
    setProfile((current) => {
      const currentLinks = getPublicSocialLinks(current);
      const nextLinks = typeof updater === 'function' ? updater(currentLinks) : updater;

      return {
        ...current,
        socialMedia: nextLinks,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [setProfile]);

  return useMemo(() => ({
    socialLinks: getPublicSocialLinks(profile),
    setSocialLinks,
    isReady,
    error,
    reload,
  }), [profile, setSocialLinks, isReady, error, reload]);
}
