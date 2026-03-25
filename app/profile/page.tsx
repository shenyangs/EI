"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, logout } from "@/lib/auth";

interface UserInfo {
  id: string;
  username: string;
  email: string;
  fullName: string;
  userType: string;
  institution: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    fullName: "",
    institution: "",
    department: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const userTypeMap: Record<string, string> = {
    student: "学生",
    lecturer: "讲师",
    associate_professor: "副教授",
    professor: "教授",
    advisor: "博导",
    admin: "管理员",
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取用户信息失败");
      }

      const data = await response.json();
      setUserInfo(data.user);
      setEditForm({
        username: data.user.username,
        fullName: data.user.fullName,
        institution: data.user.institution,
        department: data.user.department,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取用户信息失败");
      // 跳转到登录页
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    const token = getAuthToken();
    if (!token || !userInfo) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }

      const data = await response.json();
      setUserInfo(data.user);
      setIsEditing(false);
      setSaveLoading(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
      setSaveLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !userInfo) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-error">
            {error || "获取用户信息失败"}
          </div>
          <button
            className="primary-button"
            onClick={() => router.push("/login")}
          >
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>个人信息</h1>
          <p>查看和管理您的账号信息</p>
        </div>

        {saveError && (
          <div className="auth-error">
            {saveError}
          </div>
        )}

        <div className="profile-info">
          {isEditing ? (
            <div className="profile-edit-form">
              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={editForm.username}
                  onChange={handleInputChange}
                  disabled={saveLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fullName">姓名</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={editForm.fullName}
                  onChange={handleInputChange}
                  disabled={saveLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="institution">机构</label>
                <input
                  type="text"
                  id="institution"
                  name="institution"
                  value={editForm.institution}
                  onChange={handleInputChange}
                  disabled={saveLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="department">部门</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={editForm.department}
                  onChange={handleInputChange}
                  disabled={saveLoading}
                />
              </div>

              <div className="button-group">
                <button
                  className="primary-button"
                  onClick={handleSave}
                  disabled={saveLoading}
                >
                  {saveLoading ? (
                    <span className="button-loading">
                      <span className="loading-spinner loading-spinner--small"></span>
                      保存中...
                    </span>
                  ) : (
                    "保存"
                  )}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      username: userInfo.username,
                      fullName: userInfo.fullName,
                      institution: userInfo.institution,
                      department: userInfo.department,
                    });
                  }}
                  disabled={saveLoading}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-details">
              <div className="profile-item">
                <strong>用户名</strong>
                <span>{userInfo.username}</span>
              </div>
              <div className="profile-item">
                <strong>邮箱</strong>
                <span>{userInfo.email}</span>
              </div>
              <div className="profile-item">
                <strong>姓名</strong>
                <span>{userInfo.fullName}</span>
              </div>
              <div className="profile-item">
                <strong>用户类型</strong>
                <span>{userTypeMap[userInfo.userType] || userInfo.userType}</span>
              </div>
              <div className="profile-item">
                <strong>机构</strong>
                <span>{userInfo.institution}</span>
              </div>
              <div className="profile-item">
                <strong>部门</strong>
                <span>{userInfo.department}</span>
              </div>
              <div className="profile-item">
                <strong>创建时间</strong>
                <span>{new Date(userInfo.createdAt).toLocaleString()}</span>
              </div>
              <div className="profile-item">
                <strong>更新时间</strong>
                <span>{new Date(userInfo.updatedAt).toLocaleString()}</span>
              </div>

              <div className="button-group">
                <button
                  className="primary-button"
                  onClick={() => setIsEditing(true)}
                >
                  编辑信息
                </button>
                <button
                  className="secondary-button"
                  onClick={handleLogout}
                >
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
