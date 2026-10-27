import styles from "./index.module.css"

export default function Home() {
  return (
      <main>
      <div className={styles.content}>
        <img src="/images/logo-text-blue.svg" alt="Piano Party"/>
        <h1>Welcome to piano party!</h1>
        <h3>Learn piano with gamified sheet-music playing on the web.</h3>
        <p>Piano Party is a Next.js based webapp that gamifies learning sheet music by allowing users to play music on their keyboard with feedback on their performance.</p>
        <div className={styles.buttons}>
          <a href="/signup">Sign Up!</a>
          <a href="/home">Continue as Guest.</a>
        </div>
      </div>
      </main>
  );
}
