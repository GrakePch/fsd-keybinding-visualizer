import { Link } from "react-router-dom";
import styles from "./HomePage.module.css";

function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Fancy Star Config Editor</h1>
        <p className={styles.versionLabel}>pre-alpha</p>
      </header>
      <nav className={styles.actions} aria-label="Main navigation">
        <Link className={`${styles.actionButton} buttonNormal`} to="/bindings">
          Key bindings
        </Link>
        <Link className={`${styles.actionButton} buttonNormal`} to="/cameras">
          Cameras
        </Link>
      </nav>
    </main>
  );
}

export default HomePage;
