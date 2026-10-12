<script lang="ts">
  import { i18n } from './i18n.svelte'

  let operator = $state('')
  // answered by the server from EASY_DIASHOW_OPERATOR; servers without that route answer with an error or with HTML
  fetch('/operator.txt').then(
    async (response) => {
      if (response.ok && response.headers.get('content-type')?.startsWith('text/plain')) operator = (await response.text()).trim()
    },
    () => {},
  )
</script>

<article class="card stack">
  {#if i18n.language === 'de'}
    <h2>Datenschutzhinweis</h2>

    <h3>Kurz gesagt</h3>
    <p>
      Diese Anwendung läuft vollständig in Ihrem Browser. Ihre Bilder, Ihre Musik und das fertige Video werden weder an unseren Server noch an
      Dritte übertragen und dort auch nicht gespeichert.
    </p>

    {#if operator}
      <h3>Verantwortlich</h3>
      <p>{operator}</p>
    {/if}

    <h3>Aufruf der Seite</h3>
    <p>
      Beim Aufruf liefert der Server ausschließlich die Dateien der Anwendung aus. Dafür verarbeitet er technisch notwendig Ihre IP-Adresse für
      die Dauer der Verbindung. Es werden keine Zugriffsprotokolle geführt.
    </p>

    <h3>Keine Cookies, kein Tracking</h3>
    <p>
      Es werden keine Cookies gesetzt, keine Analyse- oder Tracking-Werkzeuge eingesetzt und keine Inhalte von fremden Servern nachgeladen (keine
      externen Schriften, Skripte oder Bilder).
    </p>

    <h3>Speicherung auf Ihrem Gerät</h3>
    <p>
      Projekte mit Bildern, Musik, Wasserzeichen und Einstellungen sowie die gewählte Sprache werden ausschließlich im Speicher Ihres Browsers auf
      Ihrem Gerät abgelegt, damit Sie später weiterarbeiten können. Diese Daten verlassen Ihr Gerät nicht. Sie können einzelne Projekte oder über
      „Alle Daten löschen“ sämtliche Projektdaten jederzeit in der Projektliste entfernen; das Löschen der Website-Daten im Browser entfernt alles.
    </p>

    <h3>Erstellung des Videos</h3>
    <p>
      Die Musikanalyse und die Berechnung des Videos finden auf Ihrem Gerät statt. Das fertige Video wird Ihnen direkt als Download übergeben und
      nicht von der Anwendung aufbewahrt.
    </p>

    <p><a href="#start">Zurück zur Anwendung</a></p>
  {:else}
    <h2>Privacy notice</h2>

    <h3>In short</h3>
    <p>
      This application runs entirely in your browser. Your images, your music and the finished video are neither transmitted to our server or to
      third parties nor stored there.
    </p>

    {#if operator}
      <h3>Controller</h3>
      <p>{operator}</p>
    {/if}

    <h3>Visiting the site</h3>
    <p>
      When you open the site, the server only delivers the files of the application. For this it necessarily processes your IP address for the
      duration of the connection. No access logs are kept.
    </p>

    <h3>No cookies, no tracking</h3>
    <p>
      No cookies are set, no analytics or tracking tools are used, and nothing is loaded from other servers (no external fonts, scripts or
      images).
    </p>

    <h3>Storage on your device</h3>
    <p>
      Projects with images, music, watermark and settings, as well as the chosen language, are stored only in your browser's storage on your
      device so that you can continue later. This data does not leave your device. You can remove single projects, or all project data with
      “Delete all data”, in the project list at any time; clearing the site data in your browser removes everything.
    </p>

    <h3>Creating the video</h3>
    <p>
      The music analysis and the rendering of the video happen on your device. The finished video is handed to you directly as a download and is
      not kept by the application.
    </p>

    <p><a href="#start">Back to the application</a></p>
  {/if}
</article>
