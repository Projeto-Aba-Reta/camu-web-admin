import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="min-h-svh px-4 py-12">
      <article className="mx-auto max-w-2xl rounded-lg border border-charcoal/10 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-charcoal">Política de Privacidade</h1>
        <p className="mb-8 text-sm text-charcoal/60">Última atualização: 26 de agosto de 2026.</p>

        <div className="space-y-8 text-sm leading-relaxed text-charcoal/90">
          <section>
            <h2 className="mb-2 text-base font-semibold text-charcoal">1. Quem somos</h2>
            <p>
              Esta política descreve como a Camu trata os dados pessoais coletados através do
              nosso atendimento automatizado via WhatsApp e Instagram (&quot;o Bot&quot;), usado
              para responder mensagens de clientes e interessados em nossos produtos e serviços.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-charcoal">
              2. Quais dados coletamos
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Identificação de contato:</strong> número de telefone (WhatsApp) ou
                identificador de usuário do Instagram (handle/ID) usados para lhe responder.
              </li>
              <li>
                <strong>Conteúdo das mensagens:</strong> o texto, áudio ou imagens que você envia
                pelo WhatsApp ou Instagram durante a conversa com o Bot.
              </li>
              <li>
                <strong>Conteúdo enviado a serviços de inteligência artificial:</strong> o
                conteúdo da sua mensagem é encaminhado a um provedor de IA (Google Gemini)
                exclusivamente para gerar uma resposta automática coerente com o seu pedido.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-charcoal">
              3. Por que coletamos e o que fazemos com esses dados
            </h2>
            <p>
              Usamos esses dados exclusivamente para viabilizar o atendimento automatizado:
              identificar quem está conversando, entender a mensagem enviada e gerar uma resposta
              adequada, incluindo, quando aplicável, informações sobre produtos, orçamentos e
              pedidos. Não usamos esses dados para publicidade, não os vendemos e não os
              compartilhamos com terceiros além do provedor de IA estritamente necessário para
              gerar a resposta (Google Gemini), que processa o conteúdo apenas para essa
              finalidade.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-charcoal">
              4. Por quanto tempo guardamos os dados
            </h2>
            <p>
              Mantemos o histórico de conversas pelo tempo necessário para dar continuidade ao
              atendimento e cumprir obrigações legais e contratuais, podendo ser removido
              antecipadamente mediante solicitação (veja a seção 5).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-charcoal">
              5. Como solicitar a exclusão dos seus dados
            </h2>
            <p>
              Para solicitar a exclusão dos seus dados coletados pelo Bot, envie um e-mail para{" "}
              <a
                href="mailto:contato@camu3d.com.br"
                className="text-charcoal underline underline-offset-2"
              >
                contato@camu3d.com.br
              </a>{" "}
              informando o número de telefone ou o usuário do Instagram utilizado na conversa.
              Atenderemos ao pedido em até 15 dias úteis, exceto quando houver obrigação legal de
              retenção dos dados por prazo maior.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-charcoal">6. Contato</h2>
            <p>
              Dúvidas sobre esta política podem ser enviadas para{" "}
              <a
                href="mailto:contato@camu3d.com.br"
                className="text-charcoal underline underline-offset-2"
              >
                contato@camu3d.com.br
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
