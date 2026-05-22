import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod
} from '../../../payment-enabler/payment-enabler';

import { BaseComponent } from "../../base";

import styles from '../../../style/style.module.scss';
import buttonStyles from "../../../style/button.module.scss";

import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from "../../../dtos/novalnet-payment.dto";

import { BaseOptions } from "../../../payment-enabler/novalnet-payment-enabler";

export class AchBuilder implements PaymentComponentBuilder {

  public componentHasSubmit = true;

  constructor(
    private baseOptions: BaseOptions
  ) {}

  build(
    config: ComponentOptions
  ): PaymentComponent {

    return new Ach(
      this.baseOptions,
      config
    );
  }
}

export class Ach extends BaseComponent {

  private showPayButton: boolean;

  constructor(
    baseOptions: BaseOptions,
    componentOptions: ComponentOptions
  ) {

    super(
      PaymentMethod.ach,
      baseOptions,
      componentOptions
    );

    this.showPayButton =
      componentOptions?.showPayButton ?? false;
  }

  mount(selector: string) {

    // Escape selector safely
    const safeSelector =
      selector.replace(/\|/g, '\\|');

    const container =
      document.querySelector(safeSelector);

    if (!container) {

      console.error(
        'Container not found:',
        safeSelector
      );

      return;
    }

    container.insertAdjacentHTML(
      "beforeend",
      this._getTemplate()
    );

    if (this.showPayButton) {

      const button =
        document.querySelector(
          "#achForm-paymentButton"
        );

      if (button) {

        button.addEventListener(
          "click",
          (e) => {

            e.preventDefault();

            this.submit();
          }
        );
      }
    }
  }

  async submit() {

    this.sdk.init({
      environment: this.environment
    });

    const pathLocale =
      window.location.pathname.split("/")[1];

    const url =
      new URL(window.location.href);

    const baseSiteUrl =
      url.origin;

    try {

      const accountHolderInput =
        document.getElementById(
          'achForm-accHolder'
        ) as HTMLInputElement;

      const accountNumberInput =
        document.getElementById(
          'achForm-accountNumber'
        ) as HTMLInputElement;

      const routingNumberInput =
        document.getElementById(
          'achForm-routingNumber'
        ) as HTMLInputElement;

      const accountHolder =
        accountHolderInput?.value.trim();

      const accountNumber =
        accountNumberInput?.value.trim();

      const routingNumber =
        routingNumberInput?.value.trim();

      const requestData:
        PaymentRequestSchemaDTO = {

        paymentMethod: {
          type: "DIRECT_DEBIT_ACH",

          accHolder:
            accountHolder,

          accountNumber:
            accountNumber,

          routingNumber:
            routingNumber,
        },

        paymentOutcome:
          PaymentOutcome.AUTHORIZED,

        lang:
          pathLocale ?? 'de',

        path:
          baseSiteUrl,
      };

      const response = await fetch(
        this.processorUrl + "/directPayment",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Session-Id":
              this.sessionId,
          },

          body: JSON.stringify(
            requestData
          ),
        }
      );

      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          'HTTP error response:',
          errorText
        );

        throw new Error(
          `HTTP error! status: ${response.status}`
        );
      }

      const data =
        await response.json();

      if (data.paymentReference) {

        this.onComplete &&
          this.onComplete({
            isSuccess: true,

            paymentReference:
              data.paymentReference,
          });

      } else {

        this.onError(
          "Some error occurred. Please try again."
        );
      }

    } catch (e) {

      console.error(
        'ACH payment error:',
        e
      );

      this.onError(
        "Some error occurred. Please try again."
      );
    }
  }

  private _getTemplate() {

    const locale =
      document.documentElement.lang || "en";

    return `
    <div class="${styles.wrapper}">

      <div
        style="
          display:flex;
          flex-direction:column;
          gap:16px;
        "
      >

        <div>

          <label for="achForm-accHolder">
            ${
              locale.startsWith("de")
                ? "Kontoinhaber"
                : "Account Holder"
            }
          </label>

          <input
            type="text"
            id="achForm-accHolder"
            name="accHolder"
            style="
              width:100%;
              padding:12px;
              margin-top:6px;
            "
          />

        </div>

        <div>

          <label for="achForm-accountNumber">
            ${
              locale.startsWith("de")
                ? "Kontonummer"
                : "Account Number"
            }
          </label>

          <input
            type="text"
            id="achForm-accountNumber"
            name="accountNumber"
            style="
              width:100%;
              padding:12px;
              margin-top:6px;
            "
          />

        </div>

        <div>

          <label for="achForm-routingNumber">
            ${
              locale.startsWith("de")
                ? "Bankleitzahl"
                : "Routing Number"
            }
          </label>

          <input
            type="text"
            id="achForm-routingNumber"
            name="routingNumber"
            style="
              width:100%;
              padding:12px;
              margin-top:6px;
            "
          />

        </div>

        ${
          this.showPayButton
            ? `
            <button
              class="${buttonStyles.button}
              ${buttonStyles.fullWidth}
              ${styles.submitButton}"
              id="achForm-paymentButton"
            >
              ${
                locale.startsWith("de")
                  ? "Bezahlen"
                  : "Pay"
              }
            </button>
            `
            : ""
        }

      </div>

    </div>
    `;
  }
}