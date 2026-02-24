import { AnQst } from '../AnQst-Spec-DSL' // DSL would be installed as node module so 'AnQst-Spec-DSL'
import { User, PasswordPolicy, UserCreationResult } from './types/exchange'

// Example only, for working with specification.

// Names the widget UserManagement ( Qt Widget Class Name )
declare namespace UserManagement {

    interface UserService extends AnQst.Service {
        // When editing a user
        getUserById(userId: string): AnQst.Call<User>
        // For checking availability
        userNameAvailable(userId: string): AnQst.CallSync<boolean>
        // For editing user (we can reject if there's data in the form)
        editUser(user: User): AnQst.Slot<boolean>
        // Adding a new user
        createUser(user: User): AnQst.Call<UserCreationResult>
    }

    interface FormState extends AnQst.Service {
        // Clear all inputs
        resetForm(): AnQst.Slot<void>
        // Show number of online users
        activeUsers: AnQst.Output<number>
        // We want parent to always see the current username
        currentUsername: AnQst.Input<string>
        // Show stock-market ticker Ticket-123 (feature creep)
        stocks(txt: string): AnQst.Slot<void>
        // Tell each time a user uses a swear word
        badWord(word: string): AnQst.Emitter;
        // Set a passwordpolicy (or don't)
        passwordPolicy: AnQst.Output<PasswordPolicy>
    }
}