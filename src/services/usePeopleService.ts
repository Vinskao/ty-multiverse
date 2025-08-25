/*
 * React Hook for People Service
 */

import { useState, useCallback, useEffect } from 'react';
import { peopleService, Person, Weapon, DamageCalculation } from './peopleService';

export interface UsePeopleServiceState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  requestId: string | null;
}

export interface UsePeopleServiceActions {
  reset: () => void;
  clearError: () => void;
}

// 基本 Hook 狀態管理
function usePeopleServiceState<T = any>(): [UsePeopleServiceState<T>, UsePeopleServiceActions] {
  const [state, setState] = useState<UsePeopleServiceState<T>>({
    data: null,
    loading: false,
    error: null,
    requestId: null,
  });

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      requestId: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return [state, { reset, clearError }];
}

// 1. 角色管理 Hooks

export function useInsertPerson() {
  const [state, actions] = usePeopleServiceState<Person>();

  const insertPerson = useCallback(async (person: Person) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await peopleService.insertPersonAndWait(person);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '插入角色失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, insertPerson, ...actions };
}

export function useUpdatePerson() {
  const [state, actions] = usePeopleServiceState<Person>();

  const updatePerson = useCallback(async (person: Person) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const producerResponse = await peopleService.updatePerson(person);
      setState(prev => ({ ...prev, requestId: producerResponse.requestId, loading: false }));
      return producerResponse;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '更新角色失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, updatePerson, ...actions };
}

export function useGetAllPeople() {
  const [state, actions] = usePeopleServiceState<Person[]>();

  const getAllPeople = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await peopleService.getAllPeopleAndWait();
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '獲取角色列表失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, getAllPeople, ...actions };
}

export function useGetPersonByName() {
  const [state, actions] = usePeopleServiceState<Person>();

  const getPersonByName = useCallback(async (name: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await peopleService.getPersonByNameAndWait(name);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '查詢角色失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, getPersonByName, ...actions };
}

export function useDeleteAllPeople() {
  const [state, actions] = usePeopleServiceState<void>();

  const deleteAllPeople = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await peopleService.deleteAllPeopleAndWait();
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '刪除所有角色失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, deleteAllPeople, ...actions };
}

// 2. 武器管理 Hooks

export function useGetAllWeapons() {
  const [state, actions] = usePeopleServiceState<Weapon[]>();

  const getAllWeapons = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await peopleService.getAllWeaponsAndWait();
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '獲取武器列表失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, getAllWeapons, ...actions };
}

export function useSaveWeapon() {
  const [state, actions] = usePeopleServiceState<Weapon>();

  const saveWeapon = useCallback(async (weapon: Weapon) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const producerResponse = await peopleService.saveWeapon(weapon);
      setState(prev => ({ ...prev, requestId: producerResponse.requestId, loading: false }));
      return producerResponse;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '保存武器失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, saveWeapon, ...actions };
}

// 3. 傷害計算 Hook

export function useCalculateDamage() {
  const [state, actions] = usePeopleServiceState<DamageCalculation>();

  const calculateDamage = useCallback(async (personName: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await peopleService.calculateDamageAndWait(personName);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '計算傷害失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, calculateDamage, ...actions };
}

// 4. 批量操作 Hook

export function useInsertMultiplePeople() {
  const [state, actions] = usePeopleServiceState<Person[]>();

  const insertMultiplePeople = useCallback(async (people: Person[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await peopleService.insertMultiplePeopleAndWait(people);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '批量插入角色失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, insertMultiplePeople, ...actions };
}

// 5. 通用狀態查詢 Hook

export function useRequestStatus() {
  const [state, actions] = usePeopleServiceState<any>();

  const checkStatus = useCallback(async (requestId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await peopleService.getRequestStatus(requestId);
      setState(prev => ({ ...prev, data: result, loading: false }));
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '查詢狀態失敗', 
        loading: false 
      }));
      throw error;
    }
  }, []);

  return { ...state, checkStatus, ...actions };
}

// 6. 清理 Hook

export function usePeopleServiceCleanup() {
  useEffect(() => {
    return () => {
      peopleService.cleanup();
    };
  }, []);
}

// 7. 組合 Hook - 角色管理面板

export function usePeopleManagement() {
  const [people, peopleActions] = useGetAllPeople();
  const [weapons, weaponsActions] = useGetAllWeapons();
  const insertPerson = useInsertPerson();
  const saveWeapon = useSaveWeapon();
  const calculateDamage = useCalculateDamage();

  // 自動載入數據
  useEffect(() => {
    peopleActions.getAllPeople();
    weaponsActions.getAllWeapons();
  }, []);

  return {
    people: people.data || [],
    weapons: weapons.data || [],
    loading: people.loading || weapons.loading,
    error: people.error || weapons.error,
    insertPerson: insertPerson.insertPerson,
    saveWeapon: saveWeapon.saveWeapon,
    calculateDamage: calculateDamage.calculateDamage,
    refreshPeople: peopleActions.getAllPeople,
    refreshWeapons: weaponsActions.getAllWeapons,
    clearError: () => {
      peopleActions.clearError();
      weaponsActions.clearError();
    },
  };
}
