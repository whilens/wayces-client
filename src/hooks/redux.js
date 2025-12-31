import { useDispatch, useSelector } from 'react-redux';

// Типизированные хуки для работы с Redux
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

