import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useAddresses() {
  const [state, setState] = useState({ addresses: [], loading: true, error: null });

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return api
      .get('/customer/addresses')
      .then(({ data }) => setState({ addresses: data, loading: false, error: null }))
      .catch((err) =>
        setState({ addresses: [], loading: false, error: err.response?.data?.message || 'Could not load addresses' })
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(async (payload) => {
    const { data } = await api.post('/customer/addresses', payload);
    setState((s) => ({ ...s, addresses: data }));
  }, []);

  const update = useCallback(async (addressId, payload) => {
    const { data } = await api.patch(`/customer/addresses/${addressId}`, payload);
    setState((s) => ({ ...s, addresses: data }));
  }, []);

  const remove = useCallback(async (addressId) => {
    const { data } = await api.delete(`/customer/addresses/${addressId}`);
    setState((s) => ({ ...s, addresses: data }));
  }, []);

  return { ...state, reload, add, update, remove };
}
