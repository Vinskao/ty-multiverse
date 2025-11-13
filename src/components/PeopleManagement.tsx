import React, { useState } from 'react';
import { usePeopleManagement, useInsertMultiplePeople, useDeleteAllPeople } from '../services/usePeopleService';
import type { Person, Weapon } from '../services/peopleService';

export default function PeopleManagement() {
  const {
    people,
    weapons,
    loading,
    error,
    insertPerson,
    saveWeapon,
    calculateDamage,
    refreshPeople,
    refreshWeapons,
    clearError,
  } = usePeopleManagement();

  const { insertMultiplePeople } = useInsertMultiplePeople();
  const { deleteAllPeople } = useDeleteAllPeople();

  const [newPerson, setNewPerson] = useState<Partial<Person>>({
    name: '',
    age: 25,
    level: 1,
    attributes: '',
  });

  const [newWeapon, setNewWeapon] = useState<Partial<Weapon>>({
    name: '',
    owner: '',
    attributes: '',
    baseDamage: 100,
  });

  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [damageResult, setDamageResult] = useState<any>(null);

  const handleInsertPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.name) return;

    try {
      await insertPerson(newPerson as Person);
      setNewPerson({ name: '', age: 25, level: 1, attributes: '' });
      refreshPeople();
    } catch (error) {
      console.error('插入角色失敗:', error);
    }
  };

  const handleSaveWeapon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeapon.name || !newWeapon.owner) return;

    try {
      await saveWeapon(newWeapon as Weapon);
      setNewWeapon({ name: '', owner: '', attributes: '', baseDamage: 100 });
      refreshWeapons();
    } catch (error) {
      console.error('保存武器失敗:', error);
    }
  };

  const handleCalculateDamage = async () => {
    if (!selectedPerson) return;

    try {
      const result = await calculateDamage(selectedPerson);
      setDamageResult(result);
    } catch (error) {
      console.error('計算傷害失敗:', error);
    }
  };

  const handleInsertMultiplePeople = async () => {
    const samplePeople: Person[] = [
      { name: '戰士', age: 30, level: 15, attributes: '力量型角色' },
      { name: '法師', age: 25, level: 12, attributes: '智力型角色' },
      { name: '盜賊', age: 28, level: 10, attributes: '敏捷型角色' },
    ];

    try {
      await insertMultiplePeople(samplePeople);
      refreshPeople();
    } catch (error) {
      console.error('批量插入失敗:', error);
    }
  };

  const handleDeleteAllPeople = async () => {
    if (!confirm('確定要刪除所有角色嗎？')) return;

    try {
      await deleteAllPeople();
      refreshPeople();
    } catch (error) {
      console.error('刪除所有角色失敗:', error);
    }
  };

  if (error) {
    return (
      <div className="error-container">
        <h3>錯誤</h3>
        <p>{error}</p>
        <button onClick={clearError}>清除錯誤</button>
      </div>
    );
  }

  return (
    <div className="people-management">
      <h2>角色管理系統</h2>

      {/* 載入狀態 */}
      {loading && <div className="loading">載入中...</div>}

      {/* 插入角色表單 */}
      <div className="section">
        <h3>新增角色</h3>
        <form onSubmit={handleInsertPerson}>
          <div className="form-group">
            <label>名稱:</label>
            <input
              type="text"
              value={newPerson.name}
              onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>年齡:</label>
            <input
              type="number"
              value={newPerson.age}
              onChange={(e) => setNewPerson({ ...newPerson, age: parseInt(e.target.value) })}
              required
            />
          </div>
          <div className="form-group">
            <label>等級:</label>
            <input
              type="number"
              value={newPerson.level}
              onChange={(e) => setNewPerson({ ...newPerson, level: parseInt(e.target.value) })}
              required
            />
          </div>
          <div className="form-group">
            <label>屬性:</label>
            <textarea
              value={newPerson.attributes}
              onChange={(e) => setNewPerson({ ...newPerson, attributes: e.target.value })}
            />
          </div>
          <button type="submit">新增角色</button>
        </form>
      </div>

      {/* 保存武器表單 */}
      <div className="section">
        <h3>新增武器</h3>
        <form onSubmit={handleSaveWeapon}>
          <div className="form-group">
            <label>武器名稱:</label>
            <input
              type="text"
              value={newWeapon.name}
              onChange={(e) => setNewWeapon({ ...newWeapon, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>擁有者:</label>
            <input
              type="text"
              value={newWeapon.owner}
              onChange={(e) => setNewWeapon({ ...newWeapon, owner: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>屬性:</label>
            <textarea
              value={newWeapon.attributes}
              onChange={(e) => setNewWeapon({ ...newWeapon, attributes: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>基礎傷害:</label>
            <input
              type="number"
              value={newWeapon.baseDamage}
              onChange={(e) => setNewWeapon({ ...newWeapon, baseDamage: parseInt(e.target.value) })}
              required
            />
          </div>
          <button type="submit">保存武器</button>
        </form>
      </div>

      {/* 批量操作 */}
      <div className="section">
        <h3>批量操作</h3>
        <div className="button-group">
          <button onClick={handleInsertMultiplePeople}>批量插入示例角色</button>
          <button onClick={handleDeleteAllPeople} className="danger">刪除所有角色</button>
        </div>
      </div>

      {/* 傷害計算 */}
      <div className="section">
        <h3>傷害計算</h3>
        <div className="form-group">
          <label>選擇角色:</label>
          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
          >
            <option value="">請選擇角色</option>
            {people.map((person) => (
              <option key={person.name} value={person.name}>
                {person.name} (等級 {person.level})
              </option>
            ))}
          </select>
        </div>
        <button onClick={handleCalculateDamage} disabled={!selectedPerson}>
          計算傷害
        </button>
        {damageResult && (
          <div className="damage-result">
            <h4>傷害計算結果</h4>
            <p>角色: {damageResult.personName}</p>
            <p>武器: {damageResult.weaponName}</p>
            <p>基礎傷害: {damageResult.baseDamage}</p>
            <p>最終傷害: {damageResult.finalDamage}</p>
          </div>
        )}
      </div>

      {/* 角色列表 */}
      <div className="section">
        <h3>角色列表 ({people.length})</h3>
        <button onClick={refreshPeople}>刷新</button>
        <div className="people-list">
          {people.map((person) => (
            <div key={person.name} className="person-card">
              <h4>{person.name}</h4>
              <p>年齡: {person.age}</p>
              <p>等級: {person.level}</p>
              {person.attributes && <p>屬性: {person.attributes}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* 武器列表 */}
      <div className="section">
        <h3>武器列表 ({weapons.length})</h3>
        <button onClick={refreshWeapons}>刷新</button>
        <div className="weapons-list">
          {weapons.map((weapon) => (
            <div key={weapon.name} className="weapon-card">
              <h4>{weapon.name}</h4>
              <p>擁有者: {weapon.owner}</p>
              <p>屬性: {weapon.attributes}</p>
              <p>基礎傷害: {weapon.baseDamage}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
