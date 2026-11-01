import { useOutletContext } from 'react-router-dom';
import type { useDefenceData } from '../hooks/useDefenceData';

export type DefenceOutlet = ReturnType<typeof useDefenceData>;
export const useDefence = () => useOutletContext<DefenceOutlet>();
