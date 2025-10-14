export interface IQuery {
  readonly queryName: string;
}

export interface IQueryHandler<TQuery extends IQuery, TResult = any> {
  execute(query: TQuery): Promise<TResult>;
}
