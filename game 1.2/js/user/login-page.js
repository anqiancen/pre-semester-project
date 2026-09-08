import { login, register } from "./auth.js";
import { clearLastEmail, getLastEmail, saveLastEmail } from "./storage.js";

// 这一层只负责把登录业务连接到当前页面的控件。
const form = document.querySelector("#account-form");
const modeButtons = document.querySelectorAll("[data-mode]");
const registerFields = document.querySelectorAll(".register-only");
const title = document.querySelector("#form-title");
const subtitle = document.querySelector("#form-subtitle");
const submitButton = document.querySelector("#submit-button");
const loginOptions = document.querySelector("#login-options");
const message = document.querySelector("#message");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const nickname = document.querySelector("#nickname");
const confirmPassword = document.querySelector("#confirm-password");
const remember = document.querySelector("#remember");
const showPassword = document.querySelector(".show-password");
const forgotLink = document.querySelector("#forgot-link");
let mode = "login";

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "message error" : "message";
}

function setMode(nextMode) {
  mode = nextMode;
  const isRegister = mode === "register";

  modeButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  registerFields.forEach(field => {
    field.style.display = isRegister ? "block" : "none";
  });

  title.textContent = isRegister ? "创建账号" : "欢迎回来";
  subtitle.textContent = isRegister
    ? "注册一个账号，加入这段旅程。"
    : "登录你的账号，继续你的探索旅程。";
  submitButton.textContent = isRegister ? "注册" : "登录";
  loginOptions.style.display = isRegister ? "none" : "flex";
  password.autocomplete = isRegister ? "new-password" : "current-password";
  showMessage("");
}

modeButtons.forEach(button => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

showPassword.addEventListener("click", () => {
  const visible = password.type === "text";
  password.type = visible ? "password" : "text";
  showPassword.textContent = visible ? "显示" : "隐藏";
});

forgotLink.addEventListener("click", event => {
  event.preventDefault();
  showMessage("纯本地版本暂不支持找回密码，请重新注册账号。", false);
});

form.addEventListener("submit", event => {
  event.preventDefault();

  if (!form.checkValidity()) {
    showMessage("请填写正确的邮箱，并输入至少 6 位密码。", true);
    form.reportValidity();
    return;
  }

  if (mode === "register" && password.value !== confirmPassword.value) {
    showMessage("两次输入的密码不一致，请重新确认。", true);
    return;
  }

  const result = mode === "register"
    ? register(email.value, password.value, nickname.value)
    : login(email.value, password.value);

  if (!result.ok) {
    showMessage(result.message, true);
    return;
  }

  if (remember.checked) saveLastEmail(email.value.trim().toLowerCase());
  else clearLastEmail();
  showMessage(result.message);

  // 登录或注册成功后进入第一张地图。
  setTimeout(() => {
    location.href = "map1.html";
  }, 500);
});

email.value = getLastEmail();