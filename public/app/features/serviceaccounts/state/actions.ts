import { debounce } from 'lodash';

import { getBackendSrv, locationService } from '@grafana/runtime';
import { fetchBuiltinRoles, fetchRoleOptions } from 'app/core/components/RolePicker/api';
import { contextSrv } from 'app/core/services/context_srv';
import { accessControlQueryParam } from 'app/core/utils/accessControl';
import { AccessControlAction, ServiceAccountDTO, ServiceAccountStateFilter, ThunkResult } from 'app/types';

import { ServiceAccountToken } from '../CreateServiceAccountTokenModal';

import {
  acOptionsLoaded,
  builtInRolesLoaded,
  pageChanged,
  queryChanged,
  serviceAccountLoaded,
  serviceAccountsFetchBegin,
  serviceAccountsFetched,
  serviceAccountsFetchEnd,
  serviceAccountTokensLoaded,
  serviceAccountUpdated,
  stateFilterChanged,
} from './reducers';

const BASE_URL = `/api/serviceaccounts`;

export function fetchACOptions(): ThunkResult<void> {
  return async (dispatch) => {
    try {
      if (contextSrv.licensedAccessControlEnabled() && contextSrv.hasPermission(AccessControlAction.ActionRolesList)) {
        const options = await fetchRoleOptions();
        dispatch(acOptionsLoaded(options));
      }
      if (
        !contextSrv.accessControlBuiltinRefactorEnabled() &&
        contextSrv.licensedAccessControlEnabled() &&
        contextSrv.hasPermission(AccessControlAction.ActionBuiltinRolesList)
      ) {
        const builtInRoles = await fetchBuiltinRoles();
        dispatch(builtInRolesLoaded(builtInRoles));
      }
    } catch (error) {
      console.error(error);
    }
  };
}

export function loadServiceAccount(saID: number): ThunkResult<void> {
  return async (dispatch) => {
    try {
      const response = await getBackendSrv().get(`${BASE_URL}/${saID}`, accessControlQueryParam());
      dispatch(serviceAccountLoaded(response));
    } catch (error) {
      console.error(error);
    }
  };
}

export function createServiceAccountToken(
  saID: number,
  token: ServiceAccountToken,
  onTokenCreated: (key: string) => void
): ThunkResult<void> {
  return async (dispatch) => {
    const result = await getBackendSrv().post(`${BASE_URL}/${saID}/tokens`, token);
    onTokenCreated(result.key);
    dispatch(loadServiceAccountTokens(saID));
    try {
      const response = await getBackendSrv().get(`${BASE_URL}/${saID}`, accessControlQueryParam());
      dispatch(serviceAccountUpdated(response));
    } catch (error) {
      console.error(error);
    }
  };
}

export function deleteServiceAccountToken(saID: number, id: number): ThunkResult<void> {
  return async (dispatch) => {
    await getBackendSrv().delete(`${BASE_URL}/${saID}/tokens/${id}`);
    dispatch(loadServiceAccountTokens(saID));
  };
}

export function loadServiceAccountTokens(saID: number): ThunkResult<void> {
  return async (dispatch) => {
    try {
      const response = await getBackendSrv().get(`${BASE_URL}/${saID}/tokens`);
      dispatch(serviceAccountTokensLoaded(response));
    } catch (error) {
      console.error(error);
    }
  };
}

export function updateServiceAccount(serviceAccount: ServiceAccountDTO): ThunkResult<void> {
  return async (dispatch) => {
    const response = await getBackendSrv().patch(`${BASE_URL}/${serviceAccount.id}?accesscontrol=true`, {
      ...serviceAccount,
    });
    dispatch(serviceAccountLoaded(response));
    dispatch(serviceAccountUpdated(response));
  };
}

export function removeServiceAccount(serviceAccountId: number): ThunkResult<void> {
  return async (dispatch) => {
    await getBackendSrv().delete(`${BASE_URL}/${serviceAccountId}`);
    dispatch(fetchServiceAccounts());
  };
}

// search / filtering of serviceAccounts
const getStateFilter = (value: ServiceAccountStateFilter) => {
  switch (value) {
    case ServiceAccountStateFilter.WithExpiredTokens:
      return '&expiredTokens=true';
    default:
      return '';
  }
};

export function fetchServiceAccounts(): ThunkResult<void> {
  return async (dispatch, getState) => {
    try {
      dispatch(serviceAccountsFetchBegin());
      const { perPage, page, query, serviceAccountStateFilter } = getState().serviceAccounts;
      const result = await getBackendSrv().get(
        `/api/serviceaccounts/search?perpage=${perPage}&page=${page}&query=${query}${getStateFilter(
          serviceAccountStateFilter
        )}&accesscontrol=true`
      );
      dispatch(serviceAccountsFetched(result));
    } catch (error) {
      serviceAccountsFetchEnd();
      console.error(error);
    }
  };
}

const fetchServiceAccountsWithDebounce = debounce((dispatch) => dispatch(fetchServiceAccounts()), 500, {
  leading: true,
});

export function changeQuery(query: string): ThunkResult<void> {
  return async (dispatch) => {
    dispatch(queryChanged(query));
    fetchServiceAccountsWithDebounce(dispatch);
  };
}

export function changeStateFilter(filter: ServiceAccountStateFilter): ThunkResult<void> {
  return async (dispatch) => {
    dispatch(stateFilterChanged(filter));
    dispatch(fetchServiceAccounts());
  };
}

export function changePage(page: number): ThunkResult<void> {
  return async (dispatch) => {
    dispatch(pageChanged(page));
    dispatch(fetchServiceAccounts());
  };
}

export function deleteServiceAccount(serviceAccountId: number): ThunkResult<void> {
  return async () => {
    await getBackendSrv().delete(`${BASE_URL}/${serviceAccountId}`);
    locationService.push('/org/serviceaccounts');
  };
}
