import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Method, Role } from './data/types';
export function useMethod(): [Method, (m: Method) => void] {
  const [params, setParams] = useSearchParams();
  const method = params.get('m') === 'C' ? 'C' : 'B';
  return [
    method,
    (m) => {
      const next = new URLSearchParams(params);
      next.set('m', m);
      setParams(next, { replace: true });
    },
  ];
}
export function useRole(): Role {
  const [params] = useSearchParams();
  return params.get('role') === 'bowler' ? 'bowler' : 'batter';
}
export function playerURL(id: number, role: Role, method: Method): string {
  return `/player?role=${role}&id=${id}&m=${method}`;
}
export function useBack(): () => void {
  const navigate = useNavigate(),
    location = useLocation();
  return () => {
    if (location.key !== 'default' && window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  };
}
