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

export class SepaBuilder implements PaymentComponentBuilder {

  public componentHasSubmit = true;

  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {

    return new Sepa(this.baseOptions, config);
  }
}

export class Sepa extends BaseComponent {

  private showPayButton: boolean;

  constructor(
    baseOptions: BaseOptions,
    componentOptions: ComponentOptions
  ) {

    /**
     * Keep internal payment key as "sepa"
     */
    super(
      PaymentMethod.sepa,
      baseOptions,
      componentOptions
    );

    this.showPayButton =
      componentOptions?.showPayButton ?? false;
  }

  async mount(selector: string) {

    /**
     * Escape selector safely
     */
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

    /**
     * Load Novalnet utility script
     */
    await this.loadNovalnetScript();

    /**
     * Render component
     */
    container.innerHTML =
      this._getTemplate();

    /**
     * Change storefront payment label
     */
    setTimeout(() => {

      const labels =
        document.querySelectorAll('label');

      labels.forEach((label) => {

        const text =
          label.textContent
            ?.trim()
            .toLowerCase();

        if (text?.includes('sepa')) {

          label.textContent =
            'Direct Debit SEPA';
        }
      });

    }, 300);

    /**
     * Attach button event
     */
    if (this.showPayButton) {

      const button =
        document.querySelector(
          "#sepa-payment-button"
        );

      if (button) {

        button.addEventListener(
          "click",
          async (e) => {

            e.preventDefault();

            await this.submit();
          }
        );
      }
    }
  }

  /**
   * Load NovalnetUtility.js
   */
  private async loadNovalnetScript(): Promise<void> {

    return new Promise((resolve) => {

      /**
       * Already loaded
       */
      if (
        (window as any).NovalnetUtility
      ) {

        resolve();

        return;
      }

      const script =
        document.createElement('script');

      script.src =
        'https://cdn.novalnet.de/js/v2/NovalnetUtility.js';

      script.type =
        'text/javascript';

      script.onload = () => {

        resolve();
      };

      script.onerror = () => {

        console.error(
          'Failed to load NovalnetUtility.js'
        );

        resolve();
      };

      document.head.appendChild(script);
    });
  }

  async submit() {

    /**
     * Init SDK
     */
    this.sdk.init({
      environment: this.environment
    });

    const pathLocale =
      window.location.pathname
        .split("/")[1];

    const url =
      new URL(window.location.href);

    const baseSiteUrl =
      url.origin;

    try {

      /**
       * Get form values
       */
      const accountHolderInput =
        document.getElementById(
          'nn_account_holder'
        ) as HTMLInputElement;

      const ibanInput =
        document.getElementById(
          'nn_sepa_account_no'
        ) as HTMLInputElement;

      const bicInput =
        document.getElementById(
          'nn_sepa_bic'
        ) as HTMLInputElement;

      const accountHolder =
        accountHolderInput?.value
          ?.trim() ?? '';

      const iban =
        ibanInput?.value
          ?.trim() ?? '';

      const bic =
        bicInput?.value
          ?.trim() ?? '';

      /**
       * Validation
       */
      if (!accountHolder) {

        this.onError(
          "Please enter account holder name"
        );

        return;
      }

      if (!iban) {

        this.onError(
          "Please enter IBAN"
        );

        return;
      }

      /**
       * Request payload
       */
      const requestData:
        PaymentRequestSchemaDTO = {

        paymentMethod: {

          type: "DIRECT_DEBIT_SEPA",

          accHolder:
            accountHolder,

          iban:
            iban,

          bic:
            bic,
        },

        paymentOutcome:
          PaymentOutcome.AUTHORIZED,

        lang:
          pathLocale ?? 'de',

        path:
          baseSiteUrl,
      };

      /**
       * API call
       */
      const response =
        await fetch(
          this.processorUrl +
          "/directPayment",
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              "X-Session-Id":
                this.sessionId,
            },

            body:
              JSON.stringify(
                requestData
              ),
          }
        );

      /**
       * HTTP validation
       */
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

      console.log(
        'SEPA payment response:',
        data
      );

      /**
       * Success callback
       */
      if (
        data.paymentReference
      ) {

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

    } catch (e: any) {

      console.error(
        'SEPA submit error:',
        {

          message:
            e?.message,

          stack:
            e?.stack,
        }
      );

      this.onError(
        "Some error occurred. Please try again."
      );
    }
  }

  private _getTemplate() {

    const payButton =
      this.showPayButton
        ? `
          <button
            class="
              ${buttonStyles.button}
              ${buttonStyles.fullWidth}
              ${styles.submitButton}
            "

            id="sepa-payment-button"

            type="button"
          >
            Pay Now
          </button>
        `
        : "";

    return `

      <div
        class="${styles.wrapper}"

        style="
          width:100%;
          display:flex;
          flex-direction:column;
          gap:20px;
        "
      >

        <p>
          Pay conveniently using
          Direct Debit SEPA.
        </p>

        <form
          id="nn_sepa_form"

          style="
            width:100%;
            display:flex;
            flex-direction:column;
            gap:20px;
          "
        >

          <!-- Account Holder -->
          <div
            style="
              display:flex;
              flex-direction:column;
              width:100%;
            "
          >

            <label
              for="nn_account_holder"

              style="
                font-size:14px;
                font-weight:600;
                color:#333;
                margin-bottom:6px;
              "
            >
              Account Holder
              <span style="color:red;">*</span>
            </label>

            <input
              type="text"

              id="nn_account_holder"

              name="nn_account_holder"

              autocomplete="off"

              style="
                padding:12px 14px;
                border:1px solid #d4d4d4;
                border-radius:6px;
                font-size:15px;
              "
            />
          </div>

          <!-- IBAN -->
          <div
            style="
              display:flex;
              flex-direction:column;
              width:100%;
            "
          >

            <label
              for="nn_sepa_account_no"

              style="
                font-size:14px;
                font-weight:600;
                color:#333;
                margin-bottom:6px;
              "
            >
              IBAN
              <span style="color:red;">*</span>
            </label>

            <input
              type="text"

              id="nn_sepa_account_no"

              name="nn_sepa_account_no"

              autocomplete="off"

              onkeypress="
                return NovalnetUtility.checkIban(
                  event,
                  'bic_div'
                );
              "

              onkeyup="
                return NovalnetUtility.formatIban(
                  event,
                  'bic_div'
                );
              "

              onchange="
                return NovalnetUtility.formatIban(
                  event,
                  'bic_div'
                );
              "

              style="
                padding:12px 14px;
                border:1px solid #d4d4d4;
                border-radius:6px;
                font-size:15px;
                text-transform:uppercase;
              "
            />
          </div>

          <!-- BIC -->
          <div
            id="bic_div"

            style="
              display:none;
              flex-direction:column;
              width:100%;
            "
          >

            <label
              for="nn_sepa_bic"

              style="
                font-size:14px;
                font-weight:600;
                color:#333;
                margin-bottom:6px;
              "
            >
              BIC
              <span style="color:red;">*</span>
            </label>

            <input
              type="text"

              id="nn_sepa_bic"

              name="nn_sepa_bic"

              autocomplete="off"

              onkeypress="
                return NovalnetUtility.formatBic(
                  event
                );
              "

              onchange="
                return NovalnetUtility.formatBic(
                  event
                );
              "

              style="
                padding:12px 14px;
                border:1px solid #d4d4d4;
                border-radius:6px;
                font-size:15px;
              "
            />
          </div>

          ${payButton}

        </form>

      </div>
    `;
  }
}