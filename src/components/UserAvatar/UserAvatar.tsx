import { getImageUrl } from '../../utils/imageUtils';
import './UserAvatar.css';

type UserAvatarProps = {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
};

export function resolveAvatarSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  return getImageUrl(src);
}

export function getInitials(firstName?: string, lastName?: string): string {
  const a = (firstName || '').trim().charAt(0);
  const b = (lastName || '').trim().charAt(0);
  const initials = `${a}${b}`.toUpperCase();
  return initials || '?';
}

/** Круглое фото или инициалы; для путей /uploads/… подставляет базу API */
const UserAvatar = ({
  src,
  firstName = '',
  lastName = '',
  size = 'md',
  className = '',
  alt = 'Фото профиля',
}: UserAvatarProps) => {
  const imageUrl = resolveAvatarSrc(src);
  const initials = getInitials(firstName, lastName);

  if (!imageUrl) {
    return (
      <span
        className={`user-avatar user-avatar--placeholder user-avatar--${size} ${className}`.trim()}
        role="img"
        aria-label={alt}
      >
        {initials}
      </span>
    );
  }

  return (
    <span className={`user-avatar-wrap user-avatar-wrap--${size} ${className}`.trim()}>
      <img
        src={imageUrl}
        alt={alt}
        className={`user-avatar user-avatar--${size}`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const placeholder = e.currentTarget.nextElementSibling;
          if (placeholder instanceof HTMLElement) {
            placeholder.hidden = false;
          }
        }}
      />
      <span
        className={`user-avatar user-avatar--placeholder user-avatar--${size}`}
        hidden
        aria-hidden
      >
        {initials}
      </span>
    </span>
  );
};

export default UserAvatar;
