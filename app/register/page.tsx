"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { defaultPublicSystemConfig, fetchPublicSystemConfig } from "@/lib/client/public-system";

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  institution: string;
  department: string;
  userType: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    institution: "",
    department: "",
    userType: "student",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string>("");
  const [allowRegistration, setAllowRegistration] = useState(defaultPublicSystemConfig.allowRegistration);
  const [configLoaded, setConfigLoaded] = useState(false);

  const userTypes = [
    { value: "student", label: "学生" },
    { value: "lecturer", label: "讲师" },
    { value: "associate_professor", label: "副教授" },
    { value: "professor", label: "教授" },
    { value: "advisor", label: "博导" },
    { value: "admin", label: "管理员" },
  ];

  useEffect(() => {
    void fetchPublicSystemConfig()
      .then((config) => {
        setAllowRegistration(config.allowRegistration);
        setConfigLoaded(true);
      })
      .catch(() => {
        setAllowRegistration(true);
        setConfigLoaded(true);
      });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 密码强度检测
    if (name === "password") {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password: string) => {
    if (password.length < 6) {
      setPasswordStrength("弱");
    } else if (password.length < 10) {
      setPasswordStrength("中");
    } else {
      setPasswordStrength("强");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allowRegistration) {
      setError("当前系统已关闭公开注册，请联系管理员开通账号。");
      return;
    }

    // 表单验证
    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (formData.password.length < 6) {
      setError("密码长度至少6位");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          userType: formData.userType,
          institution: formData.institution,
          department: formData.department,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "注册失败");
      }

      // 注册成功后跳转到登录页
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>注册</h1>
          <p>创建 EI 论文工作台账号</p>
        </div>

        {configLoaded && !allowRegistration ? (
          <div className="auth-error">
            当前系统已关闭公开注册。你仍然可以去登录页使用已有账号，或者联系管理员开通。
          </div>
        ) : null}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              placeholder="请输入用户名"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="请输入邮箱"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="请输入密码"
              disabled={loading}
            />
            {formData.password && (
              <div className={`password-strength password-strength--${passwordStrength}`}>
                密码强度: {passwordStrength}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              placeholder="请再次输入密码"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fullName">姓名</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              placeholder="请输入姓名"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="institution">机构</label>
            <input
              type="text"
              id="institution"
              name="institution"
              value={formData.institution}
              onChange={handleInputChange}
              required
              placeholder="请输入所属机构"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">部门</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              required
              placeholder="请输入所属部门"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="userType">用户类型</label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleInputChange}
              required
              disabled={loading}
            >
              {userTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="primary-button auth-button"
            disabled={loading || !allowRegistration}
          >
            {loading ? (
              <span className="button-loading">
                <span className="loading-spinner loading-spinner--small"></span>
                注册中...
              </span>
            ) : (
              "注册"
            )}
          </button>

          <div className="auth-footer">
            <p>已有账号？
              <Link href="/login" className="auth-link">
                立即登录
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
