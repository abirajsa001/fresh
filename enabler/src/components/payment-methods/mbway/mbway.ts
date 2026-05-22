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

export class MbwayBuilder
  implements PaymentComponentBuilder {

  public componentHasSubmit = true;

  constructor(
    private baseOptions: BaseOptions
  ) {}

  build(
    config: ComponentOptions
  ): PaymentComponent {

    return new Mbway(
      this.baseOptions,
      config
    );
  }
}

export class Mbway
  extends BaseComponent {

  private showPayButton: boolean;

  private isSubmitting = false;

  constructor(
    baseOptions: BaseOptions,
    componentOptions: ComponentOptions
  ) {

    super(
      PaymentMethod.mbway,
      baseOptions,
      componentOptions
    );

    this.showPayButton =
      componentOptions?.showPayButton ?? false;
  }

  mount(selector: string) {

    // FIX storefront selector issue
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

    // Prevent duplicate rendering
    if (
      document.getElementById(
        "novalnet-mbway-wrapper"
      )
    ) {
      return;
    }

    container.insertAdjacentHTML(
      "beforeend",
      this._getTemplate()
    );

    if (this.showPayButton) {

      const button =
        document.querySelector(
          "#mbway-paymentButton"
        ) as HTMLButtonElement | null;

      if (button) {

        button.addEventListener(
          "click",
          async (e) => {

            e.preventDefault();

            // Prevent multiple clicks
            if (this.isSubmitting) {
              return;
            }

            this.isSubmitting = true;

            button.disabled = true;

            await this.submit();

            button.disabled = false;

            this.isSubmitting = false;
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

      const requestData:
        PaymentRequestSchemaDTO = {

        paymentMethod: {
          type: "MBWAY",
        },

        paymentOutcome:
          PaymentOutcome.AUTHORIZED,

        lang:
          pathLocale ?? 'de',

        path:
          baseSiteUrl,
      };

      const response = await fetch(
        this.processorUrl + "/redirectPayment",
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

      if (data?.txnSecret) {

        window.location.href =
          data.txnSecret;

      } else {

        console.error(
          'Missing redirect URL:',
          data
        );

        this.onError(
          "Redirect URL missing."
        );
      }

    } catch (e) {

      console.error(
        'MB Way payment error:',
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

    const description =
      locale.startsWith("de")
        ? "Bezahlen Sie bequem mit MB Way."
        : "Pay easily with MB Way.";

    return `
      <div
        id="novalnet-mbway-wrapper"
        class="${styles.wrapper}"
      >

        <p>
          ${description}
        </p>

        ${
          this.showPayButton
            ? `
            <button
              class="${buttonStyles.button}
              ${buttonStyles.fullWidth}
              ${styles.submitButton}"

              id="mbway-paymentButton"
              type="button"
            >
              ${
                locale.startsWith("de")
                  ? "Bezahlen"
                  : "Pay Now"
              }
            </button>
            `
            : ""
        }

      </div>
    `;
  }
}