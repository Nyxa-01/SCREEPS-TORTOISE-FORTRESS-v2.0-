import type { Task, TaskContext } from './Task';

export class Selector implements Task {
    public constructor(private readonly children: Task[]) { }

    public run(context: TaskContext): boolean {
        for (const child of this.children) {
            if (child.run(context)) {
                return true;
            }
        }

        return false;
    }
}
