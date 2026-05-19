import { useMemo } from 'react';
import { getDefaultProfile, getPublicSocialLinks } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';

const STORAGE_KEY = 'lkp-domain-profile';

export function useProfile() {
  const domain = useStoredDomain(STORAGE_KEY, getDefaultProfile);

  return useMemo(() => ({
    profile: domain.data,
    setProfile: domain.setData,
    socialLinks: getPublicSocialLinks(domain.data),
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
