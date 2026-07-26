import type { MonthlySalesResultRow } from "@/types/vendas";

export interface ISalesResultRepository {
  // Linhas da view sales_monthly_results (grão mês × origem) cujo mês está
  // no intervalo, ambos em ISO 'YYYY-MM-DD' no primeiro dia do mês.
  //
  // A view carrega no próprio `where` o predicado de papel: quem não é
  // sócio/owner nem tem role vendas/precificacao recebe zero linhas em vez de
  // erro. Quem chama já verificou a permissão antes — isto é a segunda
  // barreira, não a primeira.
  listByMonthRange(fromMonth: string, toMonth: string): Promise<MonthlySalesResultRow[]>;
}
