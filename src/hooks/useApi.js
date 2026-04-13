import { useState, useCallback } from 'react';


export function useApi(apiFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFn(...args);
        setData(res.data);
        return res.data;
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Something went wrong';
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  return { data, loading, error, execute };
}


import { useEffect } from 'react';

export function useFetch(apiFn, deps = []) {
  const { data, loading, error, execute } = useApi(apiFn);

  useEffect(() => {
    execute();
  }, deps);

  return { data, loading, error, refetch: execute };
}
