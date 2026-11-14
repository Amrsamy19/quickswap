import React from 'react';
import { Application } from '@accounthub/shared';
import { Gamepad2 } from 'lucide-react';

export interface AppIconProps {
  app?: Application | { name: string; adapterId?: string; iconPath?: string | null };
  name?: string;
  adapterId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AppIcon: React.FC<AppIconProps> = ({
  app,
  name: nameProp,
  adapterId: adapterIdProp,
  className = '',
  size = 'md',
}) => {
  const name = (nameProp || app?.name || '').toLowerCase();
  const adapterId = (adapterIdProp || app?.adapterId || '').toLowerCase();

  // Dimension mapping
  const sizeMap = {
    sm: { box: 'w-6 h-6 rounded-lg', icon: 'w-3.5 h-3.5', text: 'text-[10px]' },
    md: { box: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4', text: 'text-xs' },
    lg: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5', text: 'text-sm' },
    xl: { box: 'w-12 h-12 rounded-2xl', icon: 'w-6 h-6', text: 'text-base' },
  };

  const dim = sizeMap[size] || sizeMap.md;

  // 1. Riot Games
  if (adapterId === 'riot' || name.includes('riot') || name.includes('league') || name.includes('valorant')) {
    return (
      <div
        className={`${dim.box} bg-[#EB0029]/15 border border-[#EB0029]/30 flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#EB0029]/10 ${className}`}
        title="Riot Games"
      >
        <svg viewBox="0 0 24 24" className={`${dim.icon} fill-[#FF4655]`} aria-label="Riot Games">
          <path d="M13.8 2.5l-9.1 5.3 3.2 8.5 2.1-1.2-.8-2.1 1.9-1.1.8 2.1 2.3-1.3-.8-2.1 1.9-1.1.8 2.1 2.3-1.3-.8-2.1 1.9-1.1.8 2.1 2.5-1.5L20 4.2l-6.2-1.7zm-8 15.6l-1.3 3.4 3.4-1.3 8.3-4.8-2.1-5.6-8.3 8.3z" />
        </svg>
      </div>
    );
  }

  // 2. Steam
  if (adapterId === 'steam' || name.includes('steam')) {
    return (
      <div
        className={`${dim.box} bg-gradient-to-br from-[#171a21] to-[#1b2838] border border-[#66c0f4]/30 flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#66c0f4]/10 ${className}`}
        title="Steam"
      >
        <svg viewBox="0 0 24 24" className={`${dim.icon} fill-[#66c0f4]`} aria-label="Steam">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5l2.42-3.48a3.5 3.5 0 0 1-.26-1.3c0-.18.02-.35.05-.52l-2.92-2.1a4.98 4.98 0 0 1-.63.04c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5c0 .24-.03.48-.08.71l2.76 1.99a3.5 3.5 0 0 1 1.82-.51c1.93 0 3.5 1.57 3.5 3.5s-1.57 3.5-3.5 3.5c-.88 0-1.68-.32-2.3-.86l-2.73 3.91C10.15 21.93 11.06 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-4.5 9c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7.5 7.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
        </svg>
      </div>
    );
  }

  // 3. Discord
  if (adapterId === 'discord' || name.includes('discord')) {
    return (
      <div
        className={`${dim.box} bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#5865F2]/10 ${className}`}
        title="Discord"
      >
        <svg viewBox="0 0 24 24" className={`${dim.icon} fill-[#5865F2]`} aria-label="Discord">
          <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.01.06.02.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
        </svg>
      </div>
    );
  }

  // 4. Epic Games
  if (adapterId === 'epic' || name.includes('epic')) {
    return (
      <div
        className={`${dim.box} bg-[#2B2D33]/80 border border-slate-600/50 flex items-center justify-center flex-shrink-0 shadow-sm shadow-slate-900 ${className}`}
        title="Epic Games"
      >
        <svg viewBox="0 0 24 24" className={`${dim.icon} fill-white`} aria-label="Epic Games">
          <path d="M12 2L4 5v6.5C4 16.5 7.5 21.2 12 22c4.5-.8 8-5.5 8-10.5V5l-8-3zm4.5 14h-7V8h7v2h-4.5v1.5h3.5v2h-3.5V14h4.5v2z" />
        </svg>
      </div>
    );
  }

  // 5. Battle.net / Blizzard
  if (adapterId === 'battlenet' || name.includes('battle.net') || name.includes('blizzard')) {
    return (
      <div
        className={`${dim.box} bg-[#00AEFF]/15 border border-[#00AEFF]/30 flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#00AEFF]/10 ${className}`}
        title="Battle.net"
      >
        <svg viewBox="0 0 24 24" className={`${dim.icon} fill-[#00AEFF]`} aria-label="Battle.net">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a3.5 3.5 0 1 1 3.5-3.5 3.5 3.5 0 0 1-3.5 3.5zm-5-3.5a1.5 1.5 0 1 1 1.5 1.5 1.5 1.5 0 0 1-1.5-1.5zm8-4a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5z" />
        </svg>
      </div>
    );
  }

  // 6. EA App / Electronic Arts
  if (adapterId === 'ea' || name.includes('ea app') || name.includes('electronic arts') || name.includes('origin')) {
    return (
      <div
        className={`${dim.box} bg-[#FF4747]/15 border border-[#FF4747]/30 flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#FF4747]/10 ${className}`}
        title="EA App"
      >
        <svg viewBox="0 0 24 24" className={`${dim.icon} fill-[#FF4747]`} aria-label="EA">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 14.5l-1.7-3h-3.6l-.7 3H7.3l3.6-9h2.2l3.6 9h-2.2zm-2.8-5l-1.2-2.1-1.2 2.1h2.4z" />
        </svg>
      </div>
    );
  }

  // 7. Custom icon path if available
  if (app && 'iconPath' in app && app.iconPath && (app.iconPath.startsWith('http') || app.iconPath.startsWith('data:'))) {
    return (
      <img
        src={app.iconPath}
        alt={app.name}
        className={`${dim.box} object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  // 8. Default Generic Gaming / App Icon
  const initials = (nameProp || app?.name || 'AP').slice(0, 2).toUpperCase();
  return (
    <div
      className={`${dim.box} bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 flex-shrink-0 ${className}`}
    >
      <Gamepad2 className={dim.icon} />
    </div>
  );
};
