export interface ICommand {
  readonly commandName: string;
}

export interface ICommandHandler<TCommand extends ICommand, TResult = any> {
  execute(command: TCommand): Promise<TResult>;
}
