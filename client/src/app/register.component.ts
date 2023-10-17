import { Component } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { HttpClient } from '@angular/common/http';
import { fido2Create, PublicKeyCredential } from "@ownid/webauthn"
import { firstValueFrom } from "rxjs";

@Component({
    styleUrls: ['./register.component.css'],
    template: `
    <div class="container" >
    <div class="content">
        <nav class="own-nav-tabs">
            <a class="own-nav-link" routerLink="../login">Log in</a>
            <a class="own-nav-link active" routerLink="../register">Create Account</a>
        </nav>
        <div class="unite-form">
            Sign-up
        </div>
        <form class="own-form" [formGroup]="form" (ngSubmit)="register()">
            <div class="email-label" >
                Enter your user name to continue:
            </div>
            <input class="own-input" type="email" placeholder="Email" formControlName="username">
            <button class="own-button" type="submit">Sign-up</button>
        </form>
    </div>
</div>
    `
})
export class RegisterComponent {
    public readonly form = this.fb.group({
        username: ['', Validators.required],
    })
    constructor(private readonly fb: FormBuilder, private readonly http: HttpClient) { }

    get username() { return this.form.controls['username']; }

    async register() {
        const username = this.username.value;
        try {
            const publicKey = await firstValueFrom(this.http.post<PublicKeyCredential>('/api/register/start', { username }));
            const data = await fido2Create(publicKey, username!);
            const result = await firstValueFrom(this.http.post<boolean>('/api/register/finish', data));
            if (result) alert('Successfully created using webAuthn');
        } catch (error) {
            console.error(error);
        }
    }
}