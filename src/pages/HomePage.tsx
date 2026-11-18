import { ScoringMethodBar } from '../components/layout/ScoringMethodBar';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, UsersRound } from 'lucide-react';
import { useMethod, playerURL } from '../routes';
import { PlayerSearch } from '../components/common/PlayerSearch';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
export default function HomePage() {
  const [method] = useMethod(),
    navigate = useNavigate();
  return (
    <>
      <section className="home-hero">
        <div className="hero-intro">
          <span className="eyebrow">THE PRESSURE PERFORMANCE INDEX</span>
          <h1>Who performs when it matters most?</h1>
          <p>Find standout performers. Understand the evidence. Build your shortlist.</p>
        </div>
        <div className="hero-actions">
          <PlayerSearch onSelect={(id, role) => navigate(playerURL(id, role, method))} />
          <Link className="button primary" to={`/player?m=${method}`}>
            Know Your Player <ArrowUpRight size={17} />
          </Link>
          <Link className="button" to={`/compare?m=${method}`}>
            <UsersRound size={17} />
            Compare Players
          </Link>
        </div>
      </section>
      <ScoringMethodBar />
      <div className="leaderboards">
        <Leaderboard role="batter" />
        <Leaderboard role="bowler" />
      </div>
    </>
  );
}
