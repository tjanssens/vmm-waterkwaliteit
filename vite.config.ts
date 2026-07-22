import { defineConfig, type Plugin } from "vite";
import { bouwCognosUrl, leesAanvraag, ValidatieFout } from "./shared/cognos.js";

/** Pad waarop de app de resultaten opvraagt; in productie is dit de Worker. */
export const DEV_PAD = "/api/resultaten";

/**
 * Tijdens ontwikkeling nemen we de rol van de Cloudflare Worker over, met
 * dezelfde validatie. Zo test je lokaal hetzelfde contract als wat live draait.
 */
function vmmProxy(): Plugin {
  return {
    name: "vmm-proxy",
    configureServer(server) {
      server.middlewares.use(DEV_PAD, async (verzoek, antwoord) => {
        const vraag = new URL(verzoek.url ?? "", "http://localhost").searchParams;

        const stuur = (status: number, body: string, type: string) => {
          antwoord.statusCode = status;
          antwoord.setHeader("Content-Type", type);
          antwoord.end(body);
        };

        let doelUrl: string;
        try {
          doelUrl = bouwCognosUrl(leesAanvraag(vraag));
        } catch (reden) {
          const boodschap = reden instanceof ValidatieFout ? reden.message : "Ongeldig verzoek.";
          return stuur(400, JSON.stringify({ fout: boodschap }), "application/json");
        }

        try {
          const bron = await fetch(doelUrl, {
            headers: { Accept: "text/plain" },
            signal: AbortSignal.timeout(90_000),
          });
          if (!bron.ok) {
            return stuur(
              502,
              JSON.stringify({ fout: `De VMM-databank gaf status ${bron.status}.` }),
              "application/json",
            );
          }
          const tekst = await bron.text();
          if (tekst.startsWith("<")) {
            return stuur(
              502,
              JSON.stringify({ fout: "De VMM-databank gaf een foutmelding." }),
              "application/json",
            );
          }
          stuur(200, tekst, "text/plain; charset=utf-8");
        } catch {
          stuur(
            504,
            JSON.stringify({ fout: "De VMM-databank antwoordde niet op tijd." }),
            "application/json",
          );
        }
      });
    },
  };
}

// De app draait op GitHub Pages onder /<repo>/, lokaal onder /.
const base = process.env.GITHUB_ACTIONS ? "/vmm-waterkwaliteit/" : "/";

export default defineConfig({
  base,
  plugins: [vmmProxy()],
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
