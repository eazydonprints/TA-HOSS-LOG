import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";


const ThemeContext = createContext();


export const ThemeProvider = ({
  children,
}) => {

  const [
    theme,
    setTheme,
  ] = useState(() => {

    const savedTheme =
      localStorage.getItem(
        "ta-hoss-theme"
      );

    return (
      savedTheme === "dark"
        ? "dark"
        : "light"
    );

  });


  /* =====================================================
     APPLY THEME
  ===================================================== */

  useEffect(() => {

    document.documentElement.setAttribute(
      "data-theme",
      theme
    );


    localStorage.setItem(
      "ta-hoss-theme",
      theme
    );

  }, [theme]);


  /* =====================================================
     TOGGLE THEME
  ===================================================== */

  const toggleTheme = () => {

    setTheme(
      (previousTheme) =>
        previousTheme === "light"
          ? "dark"
          : "light"
    );

  };


  return (

    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark:
          theme === "dark",
      }}
    >

      {children}

    </ThemeContext.Provider>

  );

};


export const useTheme = () => {

  const context =
    useContext(ThemeContext);


  if (!context) {

    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );

  }


  return context;

};