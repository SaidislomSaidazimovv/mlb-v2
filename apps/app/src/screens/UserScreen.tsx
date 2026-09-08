// "Профиль" tab — sign in (guests) or account overview (signed-in). The login form is the
// shared AuthScreen (embedded, no ✕). Signed in: profile summary + sign out + delete account.
import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { useT } from "../i18n/useT";
import { listProjects } from "../model/projects";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { uploadAvatar } from "../lib/globalLibrary";
import { AuthScreen } from "./AuthScreen";
import { Logo } from "../components/logo";

export function UserScreen() {
  const t = useT();
  const authUser = useStore((s) => s.authUser);
  const settings = useStore((s) => s.settings);
  const signOut = useStore((s) => s.signOut);
  const deleteAccount = useStore((s) => s.deleteAccount);
  useStore((s) => s.projectsRev); // refresh the count on save/delete

  const [confirmDel, setConfirmDel] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  // real avatar photo (Storage) — shown here + on the global library cards
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avBusy, setAvBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!authUser || !supabase) return;
    void supabase.from("profiles").select("avatar_url").eq("id", authUser.id).maybeSingle()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url as string); });
  }, [authUser]);
  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvBusy(true);
    const url = await uploadAvatar(f);
    setAvBusy(false);
    if (url) setAvatarUrl(url);
  };

  const runDelete = async () => {
    setDelBusy(true);
    setDelError(null);
    const r = await deleteAccount();
    setDelBusy(false);
    if (r.error) setDelError(r.error);
  };

  // guest → the login / registration form (or a note when auth isn't configured)
  if (!authUser) {
    if (!isSupabaseConfigured) {
      return (
        <section className="screen set-screen">
          <div className="qnum"><Logo height={22} /></div>
          <h1 className="h1">{t.user.guestTitle}</h1>
          <p className="sub">{t.settings.noteLocal}</p>
        </section>
      );
    }
    return <AuthScreen embedded />;
  }

  const name = settings.name.trim();
  const initial = (name || authUser.email || "?").trim().charAt(0).toUpperCase();
  const count = listProjects().length;

  return (
    <section className="screen set-screen">
      <div className="qnum"><Logo height={22} /></div>
      <h1 className="h1">{t.user.title}</h1>

      <div className="user-card">
        <div className="user-avatar" role="button" title="Загрузить фото" style={{ cursor: "pointer", overflow: "hidden", position: "relative" }} onClick={() => fileRef.current?.click()}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
        </div>
        <div className="user-meta">
          {name && <div className="user-name">{name}</div>}
          <div className="user-email">{authUser.email}</div>
          <div className="user-count">{t.user.projectsCount(count)}</div>
          <button type="button" className="user-avatar-btn" disabled={avBusy} onClick={() => fileRef.current?.click()}
            style={{ marginTop: 6, border: "none", background: "transparent", color: "var(--accent, #3b5bdb)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            {avBusy ? "Загрузка…" : avatarUrl ? "📷 Изменить фото" : "📷 Загрузить фото"}
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPickAvatar} />

      <button className="ho-download ho-download-2 set-signout" onClick={() => void signOut()} type="button">
        {t.common.signOut}
      </button>

      <div className="menu-sec-title">{t.settings.danger}</div>
      {!confirmDel ? (
        <button className="set-danger" onClick={() => { setConfirmDel(true); setDelError(null); }} type="button">
          {t.settings.deleteAccount}
        </button>
      ) : (
        <div className="set-danger-box">
          <p className="set-danger-txt">{t.settings.deleteWarn}</p>
          {delError && <div className="auth-error">{delError}</div>}
          <div className="proj-confirm">
            <button className="proj-confirm-yes" disabled={delBusy} onClick={() => void runDelete()} type="button">
              {delBusy ? t.settings.deleting : t.settings.deleteForever}
            </button>
            <button className="proj-confirm-no" onClick={() => setConfirmDel(false)} type="button">
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
