// === src/Round/Application/View/CategoryInRoundView.ts ===

export class CategoryInRoundView {
  public constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly description: string,
  ) {}
}
