# Canonical UserManagement Example

## 1. Source Spec (Input)

The following DSL input is treated as canonical for this worked example:

```ts
import { AnQst } from '../AnQst-Spec-DSL';
import { User, PasswordPolicy, UserCreationResult } from './types/exchange';

declare namespace UserManagement {
  interface UserService extends AnQst.Service {
    getUserById(userId: string): AnQst.Call<User>;
    userNameAvailable(userId: string): AnQst.Call<boolean>;
    editUser(user: User): AnQst.Slot<boolean>;
    createUser(user: User): AnQst.Call<UserCreationResult>;
  }

  interface FormState extends AnQst.Service {
    resetForm(): AnQst.Slot<void>;
    activeUsers: AnQst.Output<number>;
    currentUsername: AnQst.Input<string>;
    stocks(txt: string): AnQst.Slot<void>;
    badWord(word: string): AnQst.Emitter;
    passwordPolicy: AnQst.Output<PasswordPolicy>;
  }
}
```

## 2. Expected Generated TypeScript APIs

Representative generated TypeScript declarations:

```ts
export interface UserService {
  getUserById(userId: string): Promise<User>;
  userNameAvailable(userId: string): Promise<boolean>;
  createUser(user: User): Promise<UserCreationResult>;
  onSlot: {
    editUser(handler: (user: User) => boolean): void;
  };
}

export interface FormState {
  badWord(word: string): void;

  activeUsers(): number;
  currentUsername(): string;
  passwordPolicy(): PasswordPolicy;

  set: {
    activeUsers(value: number): void;
    currentUsername(value: string): void;
    passwordPolicy(value: PasswordPolicy): void;
  };

  onSlot: {
    resetForm(handler: () => void): void;
    stocks(handler: (txt: string) => void): void;
  };
}
```

Notes:

- `Call<T>` -> Promise return.
- `Slot<T>` -> registered handler in `onSlot`.
- `Input` and `Output` both produce read accessor + `set` publisher API for symmetry at TS surface.

## 3. Angular Usage Example

```ts
@Component({
  selector: 'app-user-management',
  template: `
    <input
      [value]="formState.currentUsername()"
      (input)="formState.set.currentUsername(($event.target as HTMLInputElement).value)"
    />
    <p>Active users: {{ formState.activeUsers() }}</p>
  `
})
export class UserManagementComponent {
  readonly userService = inject(UserServiceToken);
  readonly formState = inject(FormStateToken);

  constructor() {
    this.userService.onSlot.editUser((u) => u.userName.trim().length > 0);
    this.formState.onSlot.resetForm(() => this.formState.set.currentUsername(''));
    this.formState.onSlot.stocks((txt) => console.log('stock ticker', txt));
  }

  async loadUser(userId: string): Promise<void> {
    const user = await this.userService.getUserById(userId);
    this.formState.set.currentUsername(user.userName);
  }

  async checkName(userId: string): Promise<boolean> {
    return await this.userService.userNameAvailable(userId);
  }

  reportWord(word: string): void {
    this.formState.badWord(word);
  }
}
```

## 4. Expected Generated C++ Header Surface

Representative generated header excerpt (`UserManagement.h`):

```cpp
class UserManagement : public AngQtWidgetBridgeBase {
    Q_OBJECT
    Q_PROPERTY(double activeUsers READ activeUsers WRITE setActiveUsers NOTIFY activeUsersChanged)
    Q_PROPERTY(QString currentUsername READ currentUsername WRITE setCurrentUsername NOTIFY currentUsernameChanged)
    Q_PROPERTY(PasswordPolicy passwordPolicy READ passwordPolicy WRITE setPasswordPolicy NOTIFY passwordPolicyChanged)

public:
    using GetUserByIdCallback = std::function<void(const User&)>;
    using UserNameAvailableCallback = std::function<void(const bool&)>;
    using CreateUserCallback = std::function<void(const UserCreationResult&)>;

    explicit UserManagement(QWidget* parent = nullptr);
    ~UserManagement() override;

    // Slot<T> endpoints (Parent -> Widget)
    bool editUser(const User& user);
    void resetForm();
    void stocks(const QString& txt);

    // Mirrored property endpoints
    double activeUsers() const;
    void setActiveUsers(double value);
    QString currentUsername() const;
    void setCurrentUsername(const QString& value);
    PasswordPolicy passwordPolicy() const;
    void setPasswordPolicy(const PasswordPolicy& value);

signals:
    // Call dispatch
    void getUserById(QString userId, GetUserByIdCallback reply);
    void userNameAvailable(QString userId, UserNameAvailableCallback reply);
    void createUser(User user, CreateUserCallback reply);

    // Emitter
    void badWord(QString word);

    // Property change notifications
    void activeUsersChanged(double value);
    void currentUsernameChanged(QString value);
    void passwordPolicyChanged(PasswordPolicy value);
};
```

## 5. Expected Generated C++ Structs

Representative generated model structs from `exchange.d.ts`:

```cpp
struct User {
    QString userId;
    QString userName;
    double userAge;
    QList<double> userRoles;
};

struct PasswordPolicy {
    double minLen;
    bool specialChars;
};

struct UserCreationResult {
    bool success;
    QString message;
    std::optional<QString> userId;
};
```

## 6. CMake Expectations

Representative generated CMake shape:

```cmake
add_library(UserManagementWidget
  generated/UserManagement.cpp
  generated/UserManagement.h
  generated/models/User.h
  generated/models/PasswordPolicy.h
  generated/models/UserCreationResult.h
)

target_link_libraries(UserManagementWidget
  PRIVATE Qt6::Core Qt6::Widgets
)

target_include_directories(UserManagementWidget
  PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/generated
)
```

## 7. End-to-End Interaction Trace

1. Angular calls `await userService.getUserById("abc")`.
2. Bridge emits Qt signal `getUserById(QString, callback)`.
3. Parent handler resolves callback with `User`.
4. Bridge deserializes payload and resolves Promise in Angular.
5. Angular updates `formState.set.currentUsername(user.userName)`.
6. Parent reads mirrored `currentUsername` property on widget.

## 8. Type-Only Generation Example (No Services)

Input:

```ts
import { User } from 'types/exchange';
import * as D from 'othermodule';

interface test {
  one: number;
}

declare namespace Example {
  interface Test extends test {}
  type UserType = User;
  type SomeType = D.SomeType;
  type MyType = 'this' | 'that';
  interface SomeInterface {
    num: 1 | 2;
    tt: User;
    t: UserType;
    mt: MyType[];
  }
}
```

Expected generation:

- TypeScript:
  - `Test`, `UserType`, `SomeType`, `MyType`, `SomeInterface` emitted in generated type output.
- C++:
  - Data-carrying generated structs/aliases for `Test` and `SomeInterface`.
  - Deterministic mapping for `MyType` and `num: 1 | 2` union literals (or explicit unsupported diagnostic if union strategy is not enabled).
  - Resolved type mapping references for `UserType -> User` and `SomeType -> D::SomeType` according to configured import/type mapping rules.

## 9. Advisory Mapping Example (`AnQst.Type.*`)

Input:

```ts
declare namespace TestSpace {
  interface MyType {
    num: number;
    bigNum: bigint;
    thisToo: AnQst.Type.qint64;
    tagsA: string[];
    tagsB: Array<AnQst.Type.string>;
  }
}
```

Expected interpretation:

- `AnQst.Type.*` is advisory.
- `tagsA` and `tagsB` are equivalent array intents at the DSL level.
- Generator attempts to honor `thisToo -> qint64`; if it cannot, it falls back to inferred mapping and emits an advisory-mismatch diagnostic.

Representative C++ output (when advisory is honored):

```cpp
struct MyType {
    double num;
    qint64 bigNum;
    qint64 thisToo;
    QStringList tagsA;
    QStringList tagsB;
};
```

Representative diagnostic (when advisory cannot be honored):

```text
code: BACKEND_LIMITATION
path: TestSpace.MyType.thisToo
requested: AnQst.Type.qint64
effective: double
```

## 10. Duplicate Signature Validity Example

Invalid normative DSL input:

```ts
declare namespace TestSpace {
  interface MyService extends AnQst.Service {
    getUserMetaInfo(userId: string): AnQst.Call<AnQst.Type.json>;
    getUserMetaInfo(userId: string): AnQst.Call<object>;
  }
}
```

Why invalid:

- Duplicate method signatures with identical parameter lists are invalid in normative AnQst-Spec input.

Valid prose-only alternatives (documentation style):

```ts
// Alternative A:
// getUserMetaInfo(userId: string): AnQst.Call<AnQst.Type.json>;
//
// Alternative B:
// getUserMetaInfo(userId: string): AnQst.Call<object>;
```

