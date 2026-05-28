import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDefaultProfile, getPublicSocialLinks } from '../../services/admin/defaults';
import { contentQueryKeys } from '../../lib/queries/contentQueryKeys';
import { useAdminContentProfileQuery } from './useContentQueries';
import { updateAdminContentProfile } from '../../services/content/contentClient';
import { applyDomainUpdater, getDomainErrorMessage } from './remoteDomainState';

export function useProfile() {
  const queryClient = useQueryClient();
  const profileQuery = useAdminContentProfileQuery();
  const [mutationError, setMutationError] = useState('');
  const profile = profileQuery.data || getDefaultProfile();

  const setProfile = useCallback(async (updater) => {
    const queryKey = contentQueryKeys.profile();
    const current = queryClient.getQueryData(queryKey) || profile;
    const next = applyDomainUpdater(current, updater);

    setMutationError('');
    queryClient.setQueryData(queryKey, next);

    try {
      const savedProfile = await updateAdminContentProfile(next);
      queryClient.setQueryData(queryKey, savedProfile);
      await queryClient.invalidateQueries({ queryKey: contentQueryKeys.all });
      return savedProfile;
    } catch (error) {
      queryClient.setQueryData(queryKey, current);
      setMutationError(getDomainErrorMessage(error, 'Profil gagal disimpan. Coba lagi.'));
      throw error;
    }
  }, [profile, queryClient]);

  return useMemo(() => ({
    profile,
    setProfile,
    socialLinks: getPublicSocialLinks(profile),
    isReady: profileQuery.isFetched,
    error: mutationError || getDomainErrorMessage(profileQuery.error, ''),
    reload: () => profileQuery.refetch(),
  }), [mutationError, profile, profileQuery, setProfile]);
}
