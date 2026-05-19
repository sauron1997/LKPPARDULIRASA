import { useMemo } from 'react';
import { getDefaultModules } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';
import { MODULE_STORAGE_KEY } from '../../utils/domainRelations';

export function useModules() {
  const domain = useStoredDomain(MODULE_STORAGE_KEY, getDefaultModules);

  return useMemo(() => ({
    modules: domain.data,
    setModules: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
