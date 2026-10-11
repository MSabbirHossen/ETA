# Git Commit Guidelines & Discipline

## Conventional Commits Structure
Every commit message must follow the Conventional Commits specification:
```
<type>(<scope>): <short summary in present tense>
```

### Allowed Types
- `feat`: A new feature or functionality
- `fix`: A bug fix
- `refactor`: Code restructuring without changing external behavior or adding features
- `style`: Code style, formatting, UI/CSS styling changes
- `docs`: Documentation updates (README, docstrings, markdown guides)
- `test`: Adding, updating, or fixing tests
- `chore`: Tooling, build system, dependency updates, maintenance
- `perf`: Performance improvements

### Examples
- `feat(credits): add daily login reward`
- `feat(human-qa): add representative directory`
- `fix(chat): preserve sources when loading history`
- `refactor(api): centralize authenticated requests`
- `style(composer): improve mobile layout`
- `test(credits): verify duplicate deduction prevention`
- `docs(phase-5): update implementation checklist`

## Commit Discipline Rules
1. **Atomic Commits**: Commit every logical change separately. Do not accumulate large batches of unrelated modifications into a single giant commit.
2. **Workflow**:
   - Make a small logical change.
   - Run relevant checks / tests.
   - Inspect the diff (`git diff`).
   - Stage and commit with a descriptive Conventional Commit message.
   - Proceed to the next task.
3. **Transparent History**: The project manager or any team member must be able to understand the exact progress of the project by reading the git log.
4. **Prohibited Commit Messages**: Never use vague messages such as:
   - `update`, `changes`, `final`, `done`, `fix stuff`, `phase complete`, etc.
