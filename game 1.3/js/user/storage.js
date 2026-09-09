import { createEmptySave } from "./save-data.js";

// 所有用户数据都通过这个文件读写 localStorage。

const ACCOUNTS_KEY = "gameAccounts";
const CURRENT_USER_KEY = "currentUser";
const LAST_EMAIL_KEY = "lastLoginEmail";

export function getAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
    if (accounts && typeof accounts === "object" && !Array.isArray(accounts)) {
      return accounts;
    }
  } catch {
    // 本地数据损坏时，继续使用空账号表。
  }
  return {};
}

export function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function setCurrentUser(email) {
  localStorage.setItem(CURRENT_USER_KEY, email);
}

export function getCurrentUser() {
  return localStorage.getItem(CURRENT_USER_KEY);
}

export function saveLastEmail(email) {
  localStorage.setItem(LAST_EMAIL_KEY, email);
}

export function clearLastEmail() {
  localStorage.removeItem(LAST_EMAIL_KEY);
}

export function getLastEmail() {
  return localStorage.getItem(LAST_EMAIL_KEY) || "";
}

export function requireCurrentUser() {
  const email = getCurrentUser();
  if (!email) {
    location.href = "Login.html";
    return null;
  }
  return email;
}

export function createSave(email) {
  const key = `save_${email}`;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(createEmptySave()));
  }
}

export function getSave(email) {
  try {
    const save = JSON.parse(localStorage.getItem(`save_${email}`) || "null");
    if (save && typeof save === "object" && !Array.isArray(save)) return save;
  } catch {
    // 存档损坏时，下面返回新的空存档。
  }
  return createEmptySave();
}

export function saveGame(email, save) {
  localStorage.setItem(`save_${email}`, JSON.stringify(save));
}