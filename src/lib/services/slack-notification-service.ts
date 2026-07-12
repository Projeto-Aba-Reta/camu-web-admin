export interface ISlackNotificationService {
  sendMessage(text: string): Promise<void>;
}

// Primeira integração HTTP de saída do repositório: um POST simples para um
// Incoming Webhook do Slack, configurado por SLACK_WEBHOOK_URL. Nunca lança
// — webhook não configurado ou falha de rede apenas geram um aviso de log,
// já que a notificação é "nice-to-have" de visibilidade e não deve travar o
// fechamento do ciclo de produção/estoque (ver design.md decisão "Falha no
// Slack não deve travar a conclusão").
export class SlackNotificationService implements ISlackNotificationService {
  constructor(private readonly webhookUrl: string | undefined = process.env.SLACK_WEBHOOK_URL) {}

  async sendMessage(text: string): Promise<void> {
    if (!this.webhookUrl) {
      console.warn("SlackNotificationService: SLACK_WEBHOOK_URL não configurado, notificação não enviada.");
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        console.warn(`SlackNotificationService: webhook respondeu com status ${response.status}.`);
      }
    } catch (error) {
      console.warn("SlackNotificationService: falha ao enviar notificação ao Slack.", error);
    }
  }
}
