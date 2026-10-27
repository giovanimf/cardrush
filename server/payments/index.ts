// Domínio payments: carteira e extrato.
// Outros domínios importam só deste arquivo, nunca de arquivos internos.
export {
  lockWallets,
  getWallet,
  deposit,
  commit,
  release,
  settle,
  entries,
  totalReceivedCents,
  type WalletView,
} from "@/server/payments/service"
