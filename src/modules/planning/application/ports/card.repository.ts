import type {
  CardInput,
  CardPatch,
  CardPurchaseInput,
  CardPurchasePatch,
  CardPurchaseView,
  CreditCardView,
  StatementPaymentInput,
  StatementPaymentView,
  StatementSummary,
  StatementView,
} from "#/modules/planning/dtos/planning.dto.js";
import type { CursorPage, CursorPaginationQuery } from "#/shared/pagination/cursor-pagination.js";
export interface ICardRepository {
  listCards(query: CursorPaginationQuery): Promise<CursorPage<CreditCardView>>;
  createCard(publicId: string, input: CardInput): Promise<CreditCardView>;
  updateCard(publicId: string, input: CardPatch): Promise<CreditCardView>;
  deactivateCard(publicId: string, expectedVersion: number): Promise<void>;
  createPurchase(
    cardId: string,
    ids: Readonly<{ statement: string; transaction: string }>,
    input: CardPurchaseInput,
  ): Promise<CardPurchaseView>;
  updatePurchase(
    cardId: string,
    purchaseId: string,
    input: CardPurchasePatch,
  ): Promise<CardPurchaseView>;
  deletePurchase(cardId: string, purchaseId: string, expectedVersion: number): Promise<void>;
  listStatements(
    cardId: string,
    query: CursorPaginationQuery,
  ): Promise<CursorPage<StatementSummary>>;
  findStatement(statementId: string, query: CursorPaginationQuery): Promise<StatementView>;
  closeStatement(
    statementId: string,
    expectedVersion: number,
  ): Promise<Readonly<{ id: string; status: "CLOSED"; totalCents: number; version: number }>>;
  reopenStatement(
    statementId: string,
    expectedVersion: number,
  ): Promise<Readonly<{ id: string; status: "OPEN"; totalCents: number; version: number }>>;
  payStatement(
    statementId: string,
    ids: Readonly<{ payment: string; transaction: string }>,
    input: StatementPaymentInput,
  ): Promise<StatementPaymentView>;
}
