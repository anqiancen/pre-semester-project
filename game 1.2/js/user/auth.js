import {
  createSave,
  getAccounts,
  saveAccounts,
  setCurrentUser,
} from "./storage.js";

function cleanEmail(email) {
  return email.trim().toLowerCase();
}

export function register(email, password, nickname) {
  const accountEmail = cleanEmail(email);
  const accounts = getAccounts();

  if (accounts[accountEmail]) {
    return { ok: false, message: "这个邮箱已经注册过了。" };
  }

  // 当前项目没有服务器，密码只能保存在浏览器本地。
  accounts[accountEmail] = {
    password,
    nickname: nickname.trim(),
  };
  saveAccounts(accounts);
  createSave(accountEmail);
  setCurrentUser(accountEmail);

  return { ok: true, message: "注册成功，正在进入游戏。" };
}

export function login(email, password) {
  const accountEmail = cleanEmail(email);
  const accounts = getAccounts();
  const account = accounts[accountEmail];

  if (!account || account.password !== password) {
    return { ok: false, message: "邮箱或密码错误。" };
  }

  createSave(accountEmail);
  setCurrentUser(accountEmail);
  return { ok: true, message: "登录成功，正在进入游戏。" };
}