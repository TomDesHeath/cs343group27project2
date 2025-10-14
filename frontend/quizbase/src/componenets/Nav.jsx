import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const THEME_STORAGE_KEY = "quizbase-theme";

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedPreference === "dark") {
      return true;
    }
    if (storedPreference === "light") {
      return false;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    } else {
      root.classList.remove("dark");
      window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    }
  }, [isDark]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedPreference) {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      setIsDark(event.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setCanGoBack(window.history.length > 1);
  }, [location]);

  const toggleTheme = () => {
    setIsDark((previous) => !previous);
  };

  const handleBack = () => {
    if (canGoBack) {
      navigate(-1);
    }
  };

  const themeLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
  const primaryLinks = [
    { to: "/", label: "Home" },
    { to: "/lobby", label: "Lobby" },
    { to: "/play", label: "Match play" },
    { to: "/leaderboard", label: "Leaderboard"},
  ];

  const navLinkClasses = ({ isActive }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
      isActive
        ? "bg-brand-500 text-content-inverted shadow-sm"
        : "text-content-muted hover:text-brand-600"
    }`;

  return (
    <header className="w-full border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-4 py-4 md:flex-nowrap md:gap-6">
        <div className="flex items-center gap-3 text-content">
          {canGoBack && (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-9 items-center gap-2 rounded-md border border-border px-2 text-sm font-medium transition hover:border-brand-500 hover:text-brand-600"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <Link to="/" className="text-lg font-semibold tracking-tight">
            QuizBase
          </Link>
        </div>

        <nav className="order-3 flex w-full items-center gap-2 text-sm md:order-none md:flex-1 md:justify-center">
          {primaryLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClasses} end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-md text-content transition hover:bg-surface-subdued"
            aria-label={themeLabel}
            title={themeLabel}
          >
            {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            <span className="sr-only">{themeLabel}</span>
          </button>
          {user ? (
            <>
              <Link to="/profile" className="text-content-muted transition hover:text-brand-600">
                @{user.username ?? "me"}
              </Link>
              <button
                onClick={logout}
                className="rounded-md px-3 py-1.5 font-medium text-content transition hover:bg-surface-subdued"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-content-muted transition hover:text-brand-600">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-brand-500 px-3 py-1.5 font-medium text-content-inverted transition hover:bg-brand-600"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m0-12.728 1.414 1.414m12.728 12.728-1.414-1.414" />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" />
    </svg>
  );
}

function ArrowLeftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default Nav;
