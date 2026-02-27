"use client";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Brain,
  CheckSquare,
  LayoutDashboard,
  Trophy,
  User,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
// import { LayoutDashboard, Trophy, Brain, User, Bell, CheckSquare } from 'lucide-react'

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const { data: notifData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: async () => {
      const res = await api.get("/notifications/unread-count");
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;
  const navItems = [
    { path: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Home" },
    { path: "/tasks", icon: <CheckSquare size={20} />, label: "Tasks" },
    { path: "/leaderboard", icon: <Trophy size={20} />, label: "Ranks" },
    { path: "/ai-chat", icon: <Brain size={20} />, label: "AI" },
    { path: "/notifications", icon: <Bell size={20} />, label: "Alerts" },
    { path: "/profile", icon: <User size={20} />, label: "Profile" },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className="hidden md:flex"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "64px",
          background: "rgba(255,255,255,0.02)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "24px",
          paddingBottom: "24px",
          gap: "8px",
          zIndex: 50,
        }}
      >
        {/* Logo */}
        <div
          style={{ marginBottom: "24px", cursor: "pointer" }}
          onClick={() => router.push("/dashboard")}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 900,
              color: "#fff",
            }}
          >
            R
          </div>
        </div>

        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            title={item.label}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
              position: "relative",
              transition: "all 0.2s",
              background: isActive(item.path)
                ? "rgba(59,130,246,0.15)"
                : "transparent",
              color: isActive(item.path) ? "#3b82f6" : "#444",
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLElement).style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color = "#444";
              }
            }}
          >
            {item.icon}
            {item.path === "/notifications" && unreadCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "99px",
                  background: "#ef4444",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
            {item.path === "/profile" && unreadCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#ef4444",
                }}
              />
            )}
            {isActive(item.path) && (
              <div
                style={{
                  position: "absolute",
                  left: "-1px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "3px",
                  height: "20px",
                  background: "#3b82f6",
                  borderRadius: "0 3px 3px 0",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Mobile Bottom Nav */}
      <div
        className="flex md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(0,0,0,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 16px 20px",
          zIndex: 50,
          backdropFilter: "blur(20px)",
          justifyContent: "space-around",
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "8px 16px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: isActive(item.path) ? "#3b82f6" : "#444",
              position: "relative",
              transition: "all 0.2s",
            }}
          >
            {item.icon}
            <span
              style={{
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              {item.label}
            </span>
            {item.path === "/profile" && unreadCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "10px",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#ef4444",
                }}
              />
            )}
          </button>
        ))}
      </div>
    </>
  );
}
