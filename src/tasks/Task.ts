import type { Colony } from '../colony/Colony';

export interface TaskContext {
    colony: Colony;
    creep: Creep;
}

export interface Task {
    run(context: TaskContext): boolean;
}

export class FnTask implements Task {
    public constructor(private readonly fn: (context: TaskContext) => boolean) { }

    public run(context: TaskContext): boolean {
        return this.fn(context);
    }
}
