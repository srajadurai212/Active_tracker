// Import Dependencies
import { Link } from "react-router";
import clsx from "clsx";
import { SetStateAction, Dispatch } from "react";

// Local Imports
import logoImgLight from "@/assets/logo-light.png";
import logoImgDark from "@/assets/logo.png";
import { Menu } from "./Menu";
import { Profile } from "../../Profile";
import { useThemeContext } from "@/app/contexts/theme/context";
import { NavigationTree } from "@/@types/navigation";
import { SegmentPath } from "..";

// ----------------------------------------------------------------------

// Define Prop Types
interface MainPanelProps {
  nav: NavigationTree[];
  setActiveSegmentPath?: Dispatch<SetStateAction<SegmentPath>>;
  activeSegmentPath: SegmentPath;
}

export function MainPanel({
  nav,
  setActiveSegmentPath,
  activeSegmentPath,
}: MainPanelProps) {
  const { cardSkin } = useThemeContext();

  return (
    <div className="main-panel">
      <div
        className={clsx(
          "border-gray-150 dark:border-dark-600/80 flex h-full w-full flex-col items-center bg-white ltr:border-r rtl:border-l",
          cardSkin === "shadow" ? "dark:bg-dark-750" : "dark:bg-dark-900",
        )}
      >
        {/* Application Logo */}
        <div className="flex px-2 pt-3.5 pb-1">
          <Link to="/">
            <img src={logoImgLight} alt="InteliZIGN" className="h-8 w-auto dark:hidden" />
            <img src={logoImgDark} alt="InteliZIGN" className="h-8 w-auto hidden dark:block" />
          </Link>
        </div>

        <Menu
          nav={nav}
          activeSegmentPath={activeSegmentPath}
          setActiveSegmentPath={setActiveSegmentPath}
        />

        {/* Bottom Links */}
        <div className="flex flex-col items-center space-y-3 py-2.5">
          <Profile />
        </div>
      </div>
    </div>
  );
}
