import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { fido2Get } from "@ownid/webauthn";
import { firstValueFrom } from "rxjs";

@Component({
    styleUrls: ['./login.component.css'],
    template: `<div class="container" >
    <div class="content">
        <nav class="own-nav-tabs">
           <a class="own-nav-link active" routerLink="../login">Log in</a>
            <a class="own-nav-link" routerLink="../register">Create Account</a>
        </nav>
        <div class="unite-form">
            Sign-in
        </div>
        <form class="own-form" [formGroup]="form" (ngSubmit)="login()">
            <div class="email-label" >
                Enter your user name to continue:
            </div>
            <input class="own-input" type="email" placeholder="Email" formControlName="username">
            <button class="own-button" type="submit">Sign-in</button>
        </form>
    </div>
</div>`
})
export class LoginComponent {
    public readonly form = this.fb.group({
        username: ['', Validators.required],
    })
    constructor(private readonly fb: FormBuilder, private readonly http: HttpClient) { }

    get username() { return this.form.controls['username']; }

    async login() {
        const username = this.username.value;
        const publicKey = await firstValueFrom(this.http.post<PublicKeyCredential>('/api/login/start', { username }));
        const data = await fido2Get(publicKey, username!);
        const result = await firstValueFrom(this.http.post<boolean>('/api/login/finish', data));
        if (result) alert('Successfully authenticated using webAuthn');
    }
}