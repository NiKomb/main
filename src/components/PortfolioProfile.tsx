import { site } from '../data/site';
import { ProfileAvatar } from '../effects/profile-avatar/ProfileAvatar';
import { ContactButtons } from './ContactButtons';

export function PortfolioProfile() {
  const { name, practice, experience } = site.profile;

  return (
    <div className="portfolio-profile">
      <ProfileAvatar />
      <header className="portfolio-profile-section">
        <h2 className="portfolio-profile-name">{name}</h2>
        <p>{practice}</p>
      </header>
      <section className="portfolio-profile-section" aria-labelledby="experience-title">
        <h2 id="experience-title">Опыт</h2>
        <p>{experience}</p>
      </section>
      <ContactButtons />
    </div>
  );
}
