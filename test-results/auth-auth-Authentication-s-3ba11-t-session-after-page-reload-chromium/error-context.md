# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e8]:
        - heading "Sign in to" [level=1] [ref=e9]
        - paragraph [ref=e10]: Welcome back! Please sign in to continue
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e16]:
            - generic [ref=e18]: Email address
            - textbox "Email address" [active] [ref=e19]:
              - /placeholder: Enter your email address
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic: Password
                - generic:
                  - textbox "Password":
                    - /placeholder: Enter your password
                  - button "Show password":
                    - img
        - button "Continue" [ref=e22] [cursor=pointer]:
          - generic [ref=e23]:
            - text: Continue
            - img [ref=e24]
    - generic [ref=e27]:
      - generic [ref=e28]: Don’t have an account?
      - link "Sign up" [ref=e29] [cursor=pointer]:
        - /url: http://localhost:3000/sign-in
  - alert [ref=e30]
```