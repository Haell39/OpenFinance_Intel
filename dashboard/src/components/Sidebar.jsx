import {
  LayoutDashboard,
  Newspaper,
  Briefcase,
  Settings,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

const Sidebar = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleTheme,
  language,
}) => {
  const menuItems = [
    {
      id: "overview",
      label: language === "pt" ? "Visão de Mercado" : "Market Overview",
      icon: LayoutDashboard,
    },
    {
      id: "feed",
      label: language === "pt" ? "Feed Inteligente" : "Intelligence Feed",
      icon: Newspaper,
    },
    {
      id: "watchlist",
      label: language === "pt" ? "Minha Carteira" : "My Watchlist",
      icon: Briefcase,
    },
  ];

  return (
    <div className="h-screen w-16 md:w-64 bg-zinc-100 dark:bg-gray-950 border-r border-zinc-300 dark:border-gray-800 flex flex-col shrink-0 transition-all duration-300 shadow-sm z-20">
      {/* Brand / Logo Area */}
      <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-zinc-200 dark:border-gray-800">
        <img src="/imgs/icon.png" alt="OpenFinance" className="w-8 h-8" />
        <span className="hidden md:block ml-3 font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          OpenFinance
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 md:px-6 py-3 transition-colors duration-200 group
                ${
                  isActive
                    ? "bg-zinc-100 dark:bg-gray-900 border-r-2 border-blue-500 text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-zinc-50 dark:hover:bg-gray-900/50"
                }`}
            >
              <Icon
                size={20}
                className={
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                }
              />
              <span
                className={`hidden md:block ml-3 text-sm font-medium ${isActive ? "text-slate-900 dark:text-slate-100" : ""}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-zinc-200 dark:border-gray-800 space-y-2">
        {/* THEME TOGGLE */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center md:justify-start p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded hover:bg-zinc-100 dark:hover:bg-gray-900"
        >
          {isDark ? (
            <Sun size={20} className="text-amber-400" />
          ) : (
            <Moon size={20} className="text-indigo-600" />
          )}
          <span className="hidden md:block ml-3 text-sm font-medium">
            {isDark
              ? language === "pt"
                ? "Modo Claro"
                : "Light Mode"
              : language === "pt"
                ? "Modo Escuro"
                : "Dark Mode"}
          </span>
        </button>

        <button className="w-full flex items-center justify-center md:justify-start p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded hover:bg-zinc-100 dark:hover:bg-gray-900">
          <Settings size={20} />
          <span className="hidden md:block ml-3 text-sm">
            {language === "pt" ? "Configurações" : "Settings"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
